import { Op, col, fn, where } from 'sequelize';
import {
  bd,
  Articulo,
  Existencia,
  MovimientoInventario,
  Sucursal,
  Usuario
} from '../../modelos/index.js';
import { redondear } from '../../utilidades/dinero.js';
import { conflicto, noEncontrado } from '../../utilidades/errores.js';
import { finDelDia, inicioDelDia } from '../../utilidades/fechas.js';

export async function moverExistencia(datos, transaccion) {
  const { articulo, sucursalId, cantidad, tipo, costoUnitario, origen, origenId, usuarioId, nota } =
    datos;

  const [existencia] = await Existencia.findOrCreate({
    where: { articulo_id: articulo.id, sucursal_id: sucursalId },
    defaults: { cantidad: 0, minimo: 0 },
    transaction: transaccion
  });
  await existencia.reload({ transaction: transaccion, lock: transaccion.LOCK.UPDATE });

  const saldo = redondear(existencia.cantidad + cantidad, 3);
  if (saldo < 0) {
    throw conflicto(`No hay suficiente ${articulo.nombre} en esta sucursal`, {
      faltantes: [
        {
          articulo: articulo.nombre,
          disponible: existencia.cantidad,
          requerido: Math.abs(cantidad),
          unidad: articulo.unidad
        }
      ]
    });
  }

  await existencia.update({ cantidad: saldo }, { transaction: transaccion });
  await MovimientoInventario.create(
    {
      articulo_id: articulo.id,
      sucursal_id: sucursalId,
      usuario_id: usuarioId,
      tipo,
      cantidad,
      saldo,
      costo_unitario: costoUnitario ?? articulo.costo_promedio,
      origen,
      origen_id: origenId,
      nota
    },
    { transaction: transaccion }
  );

  return saldo;
}

export async function listarExistencias(sucursalId, filtros = {}) {
  const condicionArticulo = { activo: true };
  if (filtros.tipo) condicionArticulo.tipo = filtros.tipo;
  if (filtros.buscar) condicionArticulo.nombre = { [Op.iLike]: `%${filtros.buscar}%` };

  const existencias = await Existencia.findAll({
    where: { sucursal_id: sucursalId },
    include: [{ model: Articulo, where: condicionArticulo }],
    order: [[Articulo, 'nombre', 'ASC']]
  });

  return existencias.map((existencia) => ({
    id: existencia.id,
    articulo_id: existencia.articulo_id,
    nombre: existencia.articulo.nombre,
    tipo: existencia.articulo.tipo,
    unidad: existencia.articulo.unidad,
    costo_promedio: existencia.articulo.costo_promedio,
    cantidad: existencia.cantidad,
    minimo: existencia.minimo,
    valor: redondear(existencia.cantidad * existencia.articulo.costo_promedio),
    bajo_minimo: existencia.cantidad <= existencia.minimo
  }));
}

export async function listarAlertas(sucursalId) {
  const condicion = {
    [Op.and]: [where(col('existencia.cantidad'), Op.lte, col('existencia.minimo'))]
  };
  if (sucursalId) condicion.sucursal_id = sucursalId;

  const alertas = await Existencia.findAll({
    where: condicion,
    include: [{ model: Articulo, where: { activo: true } }, Sucursal],
    order: [
      [Sucursal, 'nombre', 'ASC'],
      [Articulo, 'nombre', 'ASC']
    ]
  });

  return alertas.map((existencia) => ({
    articulo_id: existencia.articulo_id,
    nombre: existencia.articulo.nombre,
    unidad: existencia.articulo.unidad,
    sucursal: existencia.sucursal.nombre,
    sucursal_id: existencia.sucursal_id,
    cantidad: existencia.cantidad,
    minimo: existencia.minimo,
    agotado: existencia.cantidad <= 0
  }));
}

export async function ajustar({ articuloId, sucursalId, cantidadContada, tipo, nota, usuarioId }) {
  return bd.transaction(async (transaccion) => {
    const articulo = await Articulo.findByPk(articuloId, { transaction: transaccion });
    if (!articulo) throw noEncontrado('El artículo');

    const existencia = await Existencia.findOne({
      where: { articulo_id: articuloId, sucursal_id: sucursalId },
      transaction: transaccion
    });
    const actual = existencia ? existencia.cantidad : 0;
    const diferencia =
      tipo === 'merma' ? -Math.abs(cantidadContada) : redondear(cantidadContada - actual, 3);
    if (diferencia === 0) throw conflicto('La cantidad contada es igual a la existencia actual');

    const saldo = await moverExistencia(
      {
        articulo,
        sucursalId,
        cantidad: diferencia,
        tipo,
        usuarioId,
        nota,
        origen: 'ajuste'
      },
      transaccion
    );
    return {
      articulo_id: articulo.id,
      nombre: articulo.nombre,
      anterior: actual,
      saldo,
      diferencia
    };
  });
}

export async function fijarMinimo({ articuloId, sucursalId, minimo }) {
  const [existencia] = await Existencia.findOrCreate({
    where: { articulo_id: articuloId, sucursal_id: sucursalId },
    defaults: { cantidad: 0, minimo }
  });
  await existencia.update({ minimo });
  return existencia;
}

function condicionDeMovimientos(sucursalId, filtros) {
  const condicion = { sucursal_id: sucursalId };
  if (filtros.articulo_id) condicion.articulo_id = filtros.articulo_id;
  if (filtros.tipo) condicion.tipo = filtros.tipo;
  if (filtros.desde || filtros.hasta) {
    condicion.creado_en = {};
    if (filtros.desde) condicion.creado_en[Op.gte] = inicioDelDia(filtros.desde);
    if (filtros.hasta) condicion.creado_en[Op.lte] = finDelDia(filtros.hasta);
  }
  return condicion;
}

export async function contarMovimientos(sucursalId, filtros = {}) {
  const filas = await MovimientoInventario.findAll({
    attributes: ['tipo', [fn('count', col('id')), 'total']],
    where: condicionDeMovimientos(sucursalId, filtros),
    group: ['tipo'],
    raw: true
  });
  return filas.map((fila) => ({ tipo: fila.tipo, total: Number(fila.total) }));
}

export async function listarMovimientos(sucursalId, filtros = {}) {
  const condicion = condicionDeMovimientos(sucursalId, filtros);

  return MovimientoInventario.findAll({
    where: condicion,
    include: [
      { model: Articulo, attributes: ['nombre', 'unidad'] },
      { model: Usuario, attributes: ['nombre'] }
    ],
    order: [
      ['creado_en', 'DESC'],
      ['id', 'DESC']
    ],
    limit: Math.min(Number(filtros.limite) || 100, 1000)
  });
}
