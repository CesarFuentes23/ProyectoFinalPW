// api/src/modulos/ventas/servicio.js
// pendiente: lo sube quien tiene este módulo
import { Op } from 'sequelize';
import {
  bd,
  Venta,
  VentaLinea,
  VentaPago,
  Producto,
  ComponenteReceta,
  Articulo,
  Existencia,
  Correlativo,
  Cliente,
  Sucursal,
  TurnoCaja,
  Usuario
} from '../../modelos/index.js';
import { METODOS_PAGO } from '../../config/reglas.js';
import { desglosarIva, redondear } from '../../utilidades/dinero.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../../utilidades/errores.js';
import { listaNoVacia, numeroPositivo, unoDe } from '../../utilidades/validar.js';
import { moverExistencia } from '../inventario/servicio.js';
import { costoDeReceta } from '../catalogo/servicio.js';
import { calcularResumen } from '../caja/servicio.js';
const detalleCompleto = [
  { model: VentaLinea, as: 'lineas' },
  { model: VentaPago, as: 'pagos' },
  { model: Cliente },
  { model: Sucursal },
  { model: Usuario, attributes: ['id', 'nombre'] }
];

async function prepararLineas(lineas, transaccion) {
  listaNoVacia(lineas, 'La venta');
  const ids = lineas.map((linea) => Number(linea.producto_id));
  const productos = await Producto.findAll({
    where: { id: ids, activo: true },
    include: [{ model: ComponenteReceta, as: 'receta', include: [Articulo] }],
    transaction: transaccion
  });
  const porId = new Map(productos.map((producto) => [producto.id, producto]));
  return lineas.map((linea) => {
    const producto = porId.get(Number(linea.producto_id));
    if (!producto) throw solicitudInvalida('La venta incluye un producto que no está en el menú');
    const cantidad = numeroPositivo(linea.cantidad, 'La cantidad');
    if (!Number.isInteger(cantidad))
      throw solicitudInvalida('La cantidad debe ser un número entero');
    return {
      producto,
      cantidad,
      precio_unitario: producto.precio,
      total: redondear(producto.precio * cantidad),
      costo: redondear(costoDeReceta(producto.receta) * cantidad, 4)
    };
  });
}

function consumoPorArticulo(lineas) {
  const consumo = new Map();
  lineas.forEach((linea) => {
    linea.producto.receta.forEach((componente) => {
      const previo = consumo.get(componente.articulo_id) || {
        articulo: componente.articulo,
        cantidad: 0
      };
      previo.cantidad = redondear(previo.cantidad + componente.cantidad * linea.cantidad, 3);
      consumo.set(componente.articulo_id, previo);
    });
  });
  return [...consumo.values()].sort((a, b) => a.articulo.id - b.articulo.id);
}

async function verificarExistencias(consumo, sucursalId, transaccion) {
  const existencias = await Existencia.findAll({
    where: { sucursal_id: sucursalId, articulo_id: consumo.map((item) => item.articulo.id) },
    transaction: transaccion,
    lock: transaccion.LOCK.UPDATE
  });
  const disponibles = new Map(
    existencias.map((existencia) => [existencia.articulo_id, existencia.cantidad])
  );
  const faltantes = consumo
    .filter((item) => (disponibles.get(item.articulo.id) || 0) < item.cantidad)
    .map((item) => ({
      articulo: item.articulo.nombre,
      unidad: item.articulo.unidad,
      requerido: item.cantidad,
      disponible: disponibles.get(item.articulo.id) || 0
    }));
  if (faltantes.length > 0) {
    throw conflicto('No hay insumos suficientes para completar la venta', { faltantes });
  }
}

function prepararPagos(pagos, total, efectivoRecibido) {
  listaNoVacia(pagos, 'La forma de pago');
  const limpios = pagos.map((pago) => ({
    metodo: unoDe(pago.metodo, METODOS_PAGO, 'El método de pago'),
    monto: redondear(numeroPositivo(pago.monto, 'El monto del pago')),
    referencia: pago.referencia || null
  }));
  const pagado = redondear(limpios.reduce((suma, pago) => suma + pago.monto, 0));
  if (pagado !== total) {
    throw solicitudInvalida(
      `Los pagos suman $${pagado.toFixed(2)} y el total es $${total.toFixed(2)}`
    );
  }
  const enEfectivo = redondear(
    limpios
      .filter((pago) => pago.metodo === 'efectivo')
      .reduce((suma, pago) => suma + pago.monto, 0)
  );
  const recibido = enEfectivo > 0 ? redondear(efectivoRecibido ?? enEfectivo) : 0;
  if (recibido < enEfectivo)
    throw solicitudInvalida('El efectivo recibido no cubre el pago en efectivo');
  return { pagos: limpios, recibido, cambio: redondear(recibido - enEfectivo) };
}

async function tomarCorrelativo(sucursalId, tipoDocumento, transaccion) {
  const [correlativo] = await Correlativo.findOrCreate({
    where: { sucursal_id: sucursalId, tipo_documento: tipoDocumento },
    defaults: { siguiente: 1 },
    transaction: transaccion
  });
  await correlativo.reload({ transaction: transaccion, lock: transaccion.LOCK.UPDATE });
  const numero = correlativo.siguiente;
  await correlativo.update({ siguiente: numero + 1 }, { transaction: transaccion });
  return numero;
}

export async function registrarVenta({
  usuario,
  sucursalId,
  tipoDocumento,
  clienteId,
  lineas,
  pagos,
  efectivoRecibido
}) {
  const ventaId = await bd.transaction(async (transaccion) => {
    const turno = await TurnoCaja.findOne({
      where: { usuario_id: usuario.id, sucursal_id: sucursalId, estado: 'abierto' },
      transaction: transaccion,
      lock: transaccion.LOCK.UPDATE
    });
    if (!turno) throw conflicto('Abre tu caja antes de vender');
    const sucursal = await Sucursal.findByPk(sucursalId, { transaction: transaccion });
    if (tipoDocumento === 'CCF') {
      const cliente = clienteId
        ? await Cliente.findByPk(clienteId, { transaction: transaccion })
        : null;
      if (!cliente) throw solicitudInvalida('El crédito fiscal necesita un cliente registrado');
      if (!cliente.nit || !cliente.nrc)
        throw solicitudInvalida('El cliente necesita NIT y NRC para emitir crédito fiscal');
    }
    const preparadas = await prepararLineas(lineas, transaccion);
    const consumo = consumoPorArticulo(preparadas);
    await verificarExistencias(consumo, sucursalId, transaccion);
    const totales = desglosarIva(preparadas.reduce((suma, linea) => suma + linea.total, 0));
    const cobro = prepararPagos(pagos, totales.total, efectivoRecibido);
    if (cobro.cambio > 0) {
      const enCaja = (await calcularResumen(turno, transaccion)).esperado.efectivo;
      if (cobro.cambio > enCaja) {
        throw conflicto(
          `No hay suficiente efectivo en caja para dar $${cobro.cambio.toFixed(2)} de cambio. ` +
            `En caja hay $${enCaja.toFixed(2)}`,
          { cambio: cobro.cambio, en_caja: enCaja }
        );
      }
    }
    const correlativo = await tomarCorrelativo(sucursalId, tipoDocumento, transaccion);
    const venta = await Venta.create(
      {
        sucursal_id: sucursalId,
        usuario_id: usuario.id,
        turno_id: turno.id,
        cliente_id: clienteId || null,
        tipo_documento: tipoDocumento,
        correlativo,
        numero: `${sucursal.codigo}-${tipoDocumento}-${String(correlativo).padStart(6, '0')}`,
        ...totales,
        costo: redondear(
          preparadas.reduce((suma, linea) => suma + linea.costo, 0),
          4
        ),
        efectivo_recibido: cobro.recibido,
        cambio: cobro.cambio
      },
      { transaction: transaccion }
    );
    await VentaLinea.bulkCreate(
      preparadas.map((linea) => ({
        venta_id: venta.id,
        producto_id: linea.producto.id,
        descripcion: linea.producto.nombre,
        cantidad: linea.cantidad,
        precio_unitario: linea.precio_unitario,
        total: linea.total,
        costo: linea.costo
      })),
      { transaction: transaccion }
    );
    await VentaPago.bulkCreate(
      cobro.pagos.map((pago) => ({ ...pago, venta_id: venta.id })),
      { transaction: transaccion }
    );
    for (const item of consumo) {
      await moverExistencia(
        {
          articulo: item.articulo,
          sucursalId,
          cantidad: -item.cantidad,
          tipo: 'venta',
          origen: 'venta',
          origenId: venta.id,
          usuarioId: usuario.id
        },
        transaccion
      );
    }
    return venta.id;
  });
  return obtenerVenta(ventaId);
}

export async function obtenerVenta(id, sucursalId = null) {
  const venta = await Venta.findByPk(id, { include: detalleCompleto });
  if (!venta || (sucursalId && venta.sucursal_id !== sucursalId)) throw noEncontrado('La venta');
  return venta;
}

export async function listarVentas(sucursalId, filtros = {}) {
  const condicion = { sucursal_id: sucursalId };
  if (filtros.tipo_documento) condicion.tipo_documento = filtros.tipo_documento;
  if (filtros.estado) condicion.estado = filtros.estado;
  if (filtros.turno_id) condicion.turno_id = filtros.turno_id;
  if (filtros.desde || filtros.hasta) {
    condicion.fecha = {};
    if (filtros.desde) condicion.fecha[Op.gte] = new Date(`${filtros.desde}T00:00:00`);
    if (filtros.hasta) condicion.fecha[Op.lte] = new Date(`${filtros.hasta}T23:59:59`);
  }
  return Venta.findAll({
    where: condicion,
    include: [
      { model: VentaPago, as: 'pagos' },
      { model: Cliente, attributes: ['nombre'] },
      { model: Usuario, attributes: ['nombre'] }
    ],
    order: [['id', 'DESC']],
    limit: Math.min(Number(filtros.limite) || 100, 1000)
  });
}

export async function anularVenta({ id, sucursalId, usuario, motivo }) {
  await bd.transaction(async (transaccion) => {
    const venta = await Venta.findByPk(id, {
      include: [
        { model: VentaLinea, as: 'lineas' },
        { model: TurnoCaja, as: 'turno' }
      ],
      transaction: transaccion
    });
    if (!venta || venta.sucursal_id !== sucursalId) throw noEncontrado('La venta');
    if (venta.estado === 'anulada') throw conflicto('La venta ya estaba anulada');
    if (venta.turno.estado !== 'abierto')
      throw conflicto('Solo se anulan ventas de un turno de caja que sigue abierto');
    const productos = await Producto.findAll({
      where: { id: venta.lineas.map((linea) => linea.producto_id) },
      include: [{ model: ComponenteReceta, as: 'receta', include: [Articulo] }],
      transaction: transaccion
    });
    const porId = new Map(productos.map((producto) => [producto.id, producto]));
    const devolucion = consumoPorArticulo(
      venta.lineas.map((linea) => ({
        producto: porId.get(linea.producto_id),
        cantidad: linea.cantidad
      }))
    );
    for (const item of devolucion) {
      await moverExistencia(
        {
          articulo: item.articulo,
          sucursalId,
          cantidad: item.cantidad,
          tipo: 'anulacion',
          origen: 'venta',
          origenId: venta.id,
          usuarioId: usuario.id,
          nota: motivo
        },
        transaccion
      );
    }
    await venta.update(
      { estado: 'anulada', motivo_anulacion: motivo },
      { transaction: transaccion }
    );
  });
  return obtenerVenta(id);
}
