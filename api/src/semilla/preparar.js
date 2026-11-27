import pg from 'pg';
import bcrypt from 'bcryptjs';
import entorno from '../config/entorno.js';
import {
  bd,
  Sucursal,
  Usuario,
  Articulo,
  Existencia,
  MovimientoInventario,
  Producto,
  ComponenteReceta,
  Correlativo,
  Cliente,
  Proveedor,
  PrecioProveedor,
  Empleado,
  TramoRenta,
  Venta,
  TurnoCaja
} from '../modelos/index.js';
import { TIPOS_DOCUMENTO } from '../config/reglas.js';
import { hoy, sumarDias } from '../utilidades/fechas.js';
import { registrarCompra, registrarPago } from '../modulos/compras/servicio.js';
import { abrirTurno, cerrarTurno, obtenerTurno } from '../modulos/caja/servicio.js';
import { registrarVenta } from '../modulos/ventas/servicio.js';
import { ajustar } from '../modulos/inventario/servicio.js';
import { generarPlanilla, cerrarPlanilla } from '../modulos/personal/servicio.js';
import * as datos from './datos.js';

const SIN_REPONER = ['Leche de avena', 'Barra de chocolate 70 %'];

// para reponer se le compra a quien lo venga dando más barato
const PROVEEDOR_DE = {};
Object.entries(datos.catalogos).forEach(([proveedor, articulos]) => {
  articulos.forEach(([articulo, precio]) => {
    const actual = PROVEEDOR_DE[articulo];
    if (!actual || precio < actual.precio) PROVEEDOR_DE[articulo] = { proveedor, precio };
  });
});

async function crearBaseSiFalta() {
  const cliente = new pg.Client({
    host: entorno.bd.host,
    port: entorno.bd.puerto,
    user: entorno.bd.usuario,
    password: entorno.bd.clave,
    database: 'postgres'
  });
  await cliente.connect();
  const resultado = await cliente.query('select 1 from pg_database where datname = $1', [
    entorno.bd.nombre
  ]);
  if (resultado.rowCount === 0) {
    await cliente.query(`create database "${entorno.bd.nombre}"`);
    console.log(`Base de datos ${entorno.bd.nombre} creada`);
  }
  await cliente.end();
}

async function sembrarCatalogos() {
  const sucursales = await Sucursal.bulkCreate(datos.sucursales);
  const porCodigo = new Map(sucursales.map((sucursal) => [sucursal.codigo, sucursal]));

  for (const sucursal of sucursales) {
    await Correlativo.bulkCreate(
      TIPOS_DOCUMENTO.map((tipo) => ({ sucursal_id: sucursal.id, tipo_documento: tipo }))
    );
  }

  const articulos = await Articulo.bulkCreate(
    datos.articulos.map((articulo) => ({
      nombre: articulo.nombre,
      tipo: articulo.tipo,
      unidad: articulo.unidad,
      costo_promedio: articulo.costo
    }))
  );
  const porNombre = new Map(articulos.map((articulo) => [articulo.nombre, articulo]));

  const tamano = { ESC: 1, STC: 0.7, SAN: 0.5 };
  const existencias = [];
  const objetivos = new Map();
  sucursales.forEach((sucursal, indice) => {
    datos.articulos.forEach((articulo, posicion) => {
      const factor = tamano[sucursal.codigo];
      const variacion = indice === 0 ? 1 : 0.55 + ((posicion * 7 + indice * 5) % 9) * 0.1;
      const reponer = !SIN_REPONER.includes(articulo.nombre);
      const cantidad = Math.round(articulo.inicial * factor * variacion * (reponer ? 2.2 : 1));
      objetivos.set(`${sucursal.id}-${porNombre.get(articulo.nombre).id}`, cantidad);
      existencias.push({
        articulo_id: porNombre.get(articulo.nombre).id,
        sucursal_id: sucursal.id,
        cantidad,
        minimo: Math.round(articulo.minimo * factor)
      });
    });
  });
  await Existencia.bulkCreate(existencias);

  for (const elaborado of datos.elaborados) {
    const producto = await Producto.create({
      nombre: elaborado.nombre,
      categoria: elaborado.categoria,
      tipo: 'elaborado',
      precio: elaborado.precio
    });
    await ComponenteReceta.bulkCreate(
      Object.entries(elaborado.receta).map(([nombre, cantidad]) => ({
        producto_id: producto.id,
        articulo_id: porNombre.get(nombre).id,
        cantidad
      }))
    );
  }
  for (const empacado of datos.reventa) {
    const producto = await Producto.create({ ...empacado, tipo: 'reventa' });
    await ComponenteReceta.create({
      producto_id: producto.id,
      articulo_id: porNombre.get(empacado.nombre).id,
      cantidad: 1
    });
  }

  await Cliente.bulkCreate(datos.clientes);
  const proveedores = await Proveedor.bulkCreate(datos.proveedores);
  const proveedorPorNombre = new Map(proveedores.map((proveedor) => [proveedor.nombre, proveedor]));
  const precios = [];
  Object.entries(datos.catalogos).forEach(([proveedor, articulos]) => {
    articulos.forEach(([articulo, precio]) => {
      precios.push({
        proveedor_id: proveedorPorNombre.get(proveedor).id,
        articulo_id: porNombre.get(articulo).id,
        precio
      });
    });
  });
  await PrecioProveedor.bulkCreate(precios);
  await TramoRenta.bulkCreate(datos.tramosRenta);

  const empleados = await Empleado.bulkCreate(
    datos.empleados.map((empleado) => ({
      nombres: empleado.nombres,
      apellidos: empleado.apellidos,
      dui: empleado.dui,
      cargo: empleado.cargo,
      salario_mensual: empleado.salario,
      fecha_ingreso: empleado.ingreso,
      afp: empleado.afp,
      sucursal_id: porCodigo.get(empleado.sucursal).id
    }))
  );
  const porDui = new Map(empleados.map((empleado) => [empleado.dui, empleado]));

  const claveHash = await bcrypt.hash(datos.CLAVE_DEMO, 10);
  await Usuario.bulkCreate(
    datos.usuarios.map((usuario) => ({
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      clave_hash: claveHash,
      sucursal_id: porCodigo.get(usuario.sucursal).id,
      empleado_id: porDui.get(usuario.dui).id
    }))
  );

  return { porCodigo, porNombre, objetivos };
}

function momento(dia, hora, minuto = 0) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dia);
  fecha.setHours(hora, minuto, 0, 0);
  return fecha;
}

async function fecharMovimientos(origen, origenId, fecha) {
  await bd.query(
    'update movimiento_inventario set creado_en = $1 where origen = $2 and origen_id = $3',
    {
      bind: [fecha, origen, origenId]
    }
  );
}

function planDeCompras({ porCodigo, porNombre }) {
  const linea = (nombre, cantidad) => ({ articulo_id: porNombre.get(nombre).id, cantidad });
  const proveedor = async (nombre) => (await Proveedor.findOne({ where: { nombre } })).id;
  const compra = (dia, correo, codigo, armar, pago) => ({
    dia,
    correo,
    sucursalId: porCodigo.get(codigo).id,
    armar,
    pago
  });

  return [
    compra(
      20,
      'gerente.escalon@origenes.sv',
      'ESC',
      async () => ({
        proveedor_id: await proveedor('Lácteos del Corral, S.A. de C.V.'),
        tipo_documento: 'CCF',
        numero_documento: '018830',
        condicion: 'credito',
        lineas: [
          linea('Leche entera', 30000),
          linea('Crema salvadoreña', 2000),
          linea('Quesillo', 3000)
        ]
      }),
      { dia: 6, monto: 30, metodo: 'transferencia', referencia: 'TRF-88213' }
    ),
    compra(12, 'gerente.escalon@origenes.sv', 'ESC', async () => ({
      proveedor_id: await proveedor('Cooperativa Cafetalera Los Pirineos'),
      tipo_documento: 'CCF',
      numero_documento: '004512',
      condicion: 'credito',
      lineas: [
        linea('Café de especialidad en grano', 9000),
        linea('Café en grano Apaneca 340 g', 12)
      ]
    })),
    compra(10, 'gerente.santaana@origenes.sv', 'SAN', async () => ({
      proveedor_id: await proveedor('Empaques y Desechables Cuscatlán'),
      tipo_documento: 'CCF',
      numero_documento: '002251',
      condicion: 'credito',
      lineas: [linea('Vaso de 12 oz', 300), linea('Tapadera', 500), linea('Viñeta', 400)]
    })),
    compra(
      9,
      'gerente.tecla@origenes.sv',
      'STC',
      async () => ({
        proveedor_id: await proveedor('Cooperativa Cafetalera Los Pirineos'),
        tipo_documento: 'CCF',
        numero_documento: '004538',
        condicion: 'credito',
        lineas: [
          linea('Café de especialidad en grano', 5000),
          linea('Café molido Chalatenango 340 g', 10)
        ]
      }),
      { dia: 3, total: true, metodo: 'transferencia', referencia: 'TRF-90417' }
    ),
    compra(8, 'gerente.escalon@origenes.sv', 'ESC', async () => ({
      proveedor_id: await proveedor('Energía y Servicios del Centro'),
      tipo_documento: 'CCF',
      numero_documento: '9930041',
      condicion: 'credito',
      lineas: [{ descripcion: 'Energía eléctrica de octubre', cantidad: 1, costo_unitario: 318.4 }]
    })),
    compra(8, 'gerente.tecla@origenes.sv', 'STC', async () => ({
      proveedor_id: await proveedor('Energía y Servicios del Centro'),
      tipo_documento: 'CCF',
      numero_documento: '9930077',
      condicion: 'credito',
      lineas: [{ descripcion: 'Energía eléctrica de octubre', cantidad: 1, costo_unitario: 214.9 }]
    })),
    compra(5, 'gerente.tecla@origenes.sv', 'STC', async () => ({
      proveedor_id: await proveedor('Lácteos del Corral, S.A. de C.V.'),
      tipo_documento: 'CCF',
      numero_documento: '018907',
      condicion: 'credito',
      lineas: [linea('Leche entera', 20000), linea('Quesillo', 2000)]
    })),
    compra(4, 'gerente.escalon@origenes.sv', 'ESC', async () => ({
      proveedor_id: await proveedor('Empaques y Desechables Cuscatlán'),
      tipo_documento: 'CCF',
      numero_documento: '002207',
      condicion: 'credito',
      lineas: [linea('Vaso de 16 oz', 500), linea('Vaso de 12 oz', 500), linea('Tapadera', 1000)]
    })),
    compra(3, 'gerente.santaana@origenes.sv', 'SAN', async () => ({
      proveedor_id: await proveedor('Distribuidora La Tiendona'),
      tipo_documento: 'FCF',
      numero_documento: '77391',
      condicion: 'contado',
      metodo_pago: 'efectivo',
      lineas: [linea('Aguacate', 2500), linea('Huevo', 90), linea('Frijoles molidos', 3000)]
    })),
    compra(2, 'gerente.escalon@origenes.sv', 'ESC', async () => ({
      proveedor_id: await proveedor('Distribuidora La Tiendona'),
      tipo_documento: 'FCF',
      numero_documento: '77120',
      condicion: 'contado',
      metodo_pago: 'efectivo',
      lineas: [linea('Aguacate', 4000), linea('Huevo', 120), linea('Plátano maduro', 40)]
    }))
  ];
}

function planDeAjustes({ porCodigo, porNombre }) {
  const ajuste = (dia, correo, codigo, articulo, tipo, cantidad, nota) => ({
    dia,
    correo,
    sucursalId: porCodigo.get(codigo).id,
    articuloId: porNombre.get(articulo).id,
    tipo,
    cantidad,
    nota
  });
  return [
    ajuste(5, 'gerente.escalon@origenes.sv', 'ESC', 'Leche entera', 'merma', 1000, 'Galón vencido'),
    ajuste(
      4,
      'gerente.santaana@origenes.sv',
      'SAN',
      'Aguacate',
      'merma',
      450,
      'Aguacates pasados de maduros'
    ),
    ajuste(
      3,
      'gerente.tecla@origenes.sv',
      'STC',
      'Pan de masa madre',
      'merma',
      4,
      'Pan del día anterior'
    ),
    ajuste(
      2,
      'gerente.escalon@origenes.sv',
      'ESC',
      'Huevo',
      'merma',
      6,
      'Huevos quebrados al recibir el pedido'
    ),
    ajuste(
      1,
      'gerente.tecla@origenes.sv',
      'STC',
      'Café de especialidad en grano',
      'conteo',
      -150,
      'Conteo físico semanal'
    ),
    ajuste(
      1,
      'gerente.escalon@origenes.sv',
      'ESC',
      'Quesillo',
      'conteo',
      120,
      'Conteo físico semanal'
    ),
    ajuste(
      1,
      'gerente.santaana@origenes.sv',
      'SAN',
      'Azúcar',
      'conteo',
      -200,
      'Conteo físico semanal'
    )
  ];
}

async function sembrarCompra(compra) {
  const gerente = await Usuario.findOne({ where: { correo: compra.correo } });
  const fecha = sumarDias(hoy(), -compra.dia);
  const registrada = await registrarCompra({
    usuario: gerente,
    sucursalId: compra.sucursalId,
    datos: { ...(await compra.armar()), fecha }
  });
  await fecharMovimientos('compra', registrada.id, momento(compra.dia, 6, 30));
  return { registrada, gerente };
}

async function reabastecer(dia, { porCodigo, objetivos }) {
  const articulos = await Articulo.findAll({ order: [['id', 'ASC']] });
  const proveedores = new Map(
    (await Proveedor.findAll()).map((proveedor) => [proveedor.nombre, proveedor.id])
  );
  const gerentes = {
    ESC: 'gerente.escalon@origenes.sv',
    STC: 'gerente.tecla@origenes.sv',
    SAN: 'gerente.santaana@origenes.sv'
  };

  for (const [codigo, correo] of Object.entries(gerentes)) {
    const sucursalId = porCodigo.get(codigo).id;
    const gerente = await Usuario.findOne({ where: { correo } });
    const existencias = new Map(
      (await Existencia.findAll({ where: { sucursal_id: sucursalId } })).map((e) => [
        e.articulo_id,
        e.cantidad
      ])
    );

    const pedidos = new Map();
    for (const articulo of articulos) {
      if (SIN_REPONER.includes(articulo.nombre)) continue;
      const falta = Math.round(
        (objetivos.get(`${sucursalId}-${articulo.id}`) || 0) - (existencias.get(articulo.id) || 0)
      );
      if (falta <= 0) continue;
      const { proveedor } = PROVEEDOR_DE[articulo.nombre];
      if (!pedidos.has(proveedor)) pedidos.set(proveedor, []);
      pedidos.get(proveedor).push({ articulo_id: articulo.id, cantidad: falta });
    }

    let indice = 0;
    for (const [proveedor, lineas] of pedidos) {
      indice += 1;
      const registrada = await registrarCompra({
        usuario: gerente,
        sucursalId,
        datos: {
          proveedor_id: proveedores.get(proveedor),
          tipo_documento: 'CCF',
          numero_documento: `R${codigo}${String(dia).padStart(2, '0')}${indice}`,
          fecha: sumarDias(hoy(), -dia),
          condicion: 'contado',
          metodo_pago: 'transferencia',
          lineas
        }
      });
      await fecharMovimientos('compra', registrada.id, momento(dia, 6, 15));
    }
  }
}

async function sembrarAjuste(ajuste) {
  const gerente = await Usuario.findOne({ where: { correo: ajuste.correo } });
  const existencia = await Existencia.findOne({
    where: { articulo_id: ajuste.articuloId, sucursal_id: ajuste.sucursalId }
  });
  const esMerma = ajuste.tipo === 'merma';
  await ajustar({
    articuloId: ajuste.articuloId,
    sucursalId: ajuste.sucursalId,
    cantidadContada: esMerma ? ajuste.cantidad : existencia.cantidad + ajuste.cantidad,
    tipo: esMerma ? 'merma' : 'ajuste',
    nota: ajuste.nota,
    usuarioId: gerente.id
  });
  await bd.query(
    `update movimiento_inventario set creado_en = $1
     where id = (select max(id) from movimiento_inventario
                 where origen = 'ajuste' and articulo_id = $2 and sucursal_id = $3)`,
    { bind: [momento(ajuste.dia, 18, 40), ajuste.articuloId, ajuste.sucursalId] }
  );
}

async function sembrarVentasDelDia({
  dia,
  cajero,
  sucursalId,
  intensidad,
  desfase,
  productos,
  cliente
}) {
  const metodos = ['efectivo', 'tarjeta', 'efectivo', 'tarjeta', 'bitcoin', 'efectivo'];
  const turno = await abrirTurno({ usuario: cajero, sucursalId, fondoInicial: 60 });
  const cuantas =
    dia === 0 ? 5 : Math.max(4, Math.round((24 + ((dia * 5 + desfase) % 7)) * intensidad));

  for (let n = 0; n < cuantas; n += 1) {
    const elegidos = new Map();
    const variedad = 2 + ((n + dia) % 2);
    for (let k = 0; k < variedad; k += 1) {
      const producto = productos[(dia * 5 + n * 3 + k * 7 + desfase) % productos.length];
      elegidos.set(
        producto.id,
        (elegidos.get(producto.id) || 0) + 1 + ((n + k + dia) % 3 === 0 ? 1 : 0)
      );
    }
    const lineas = [...elegidos].map(([productoId, cantidad]) => ({
      producto_id: productoId,
      cantidad
    }));

    const total = lineas.reduce((suma, item) => {
      const producto = productos.find((p) => p.id === item.producto_id);
      return Math.round((suma + producto.precio * item.cantidad) * 100) / 100;
    }, 0);
    const metodo = metodos[(dia + n + desfase) % metodos.length];
    const esCredito = n % 9 === 2;

    let venta;
    try {
      venta = await registrarVenta({
        usuario: cajero,
        sucursalId,
        tipoDocumento: esCredito ? 'CCF' : 'FCF',
        clienteId: esCredito ? cliente.id : null,
        lineas,
        pagos: [
          { metodo, monto: total, referencia: metodo === 'efectivo' ? null : `REF-${dia}${n}` }
        ],
        efectivoRecibido: metodo === 'efectivo' ? Math.ceil(total / 5) * 5 : undefined
      });
    } catch (error) {
      continue;
    }

    let fecha;
    if (dia === 0) {
      fecha = new Date();
      fecha.setMinutes(fecha.getMinutes() - (cuantas - n) * 25);
      const temprano = momento(0, 0, 5 + n);
      if (fecha < temprano) fecha = temprano;
    } else {
      fecha = momento(dia, 7, Math.floor((n * 660) / cuantas) + ((desfase * 3) % 7));
    }
    await Venta.update({ fecha }, { where: { id: venta.id } });
    await fecharMovimientos('venta', venta.id, fecha);
  }

  if (dia === 0) {
    let apertura = new Date();
    apertura.setMinutes(apertura.getMinutes() - (cuantas + 1) * 25);
    const temprano = momento(0, 0, 1);
    if (apertura < temprano) apertura = temprano;
    await TurnoCaja.update({ abierto_en: apertura }, { where: { id: turno.id } });
    return;
  }

  const esperado = (await obtenerTurno(turno.id, cajero)).resumen.esperado;
  const faltante = dia === 3 && desfase === 0 ? -1.5 : 0;
  await cerrarTurno({
    id: turno.id,
    usuario: cajero,
    datos: {
      contado_efectivo: esperado.efectivo + faltante,
      contado_tarjeta: esperado.tarjeta,
      contado_bitcoin: esperado.bitcoin,
      observacion: faltante ? 'Faltante por cambio mal entregado' : null
    }
  });
  await TurnoCaja.update(
    { abierto_en: momento(dia, 6, 45), cerrado_en: momento(dia, 18, 10) },
    { where: { id: turno.id } }
  );
}

async function sembrarOperacion(contexto) {
  const { porCodigo } = contexto;
  const productos = await Producto.findAll({ order: [['id', 'ASC']] });
  const clientes = await Cliente.findAll({ order: [['id', 'ASC']] });
  const cajas = [
    {
      correo: 'caja.escalon@origenes.sv',
      codigo: 'ESC',
      intensidad: 1.25,
      desfase: 0,
      incluirHoy: false
    },
    {
      correo: 'caja.tecla@origenes.sv',
      codigo: 'STC',
      intensidad: 0.7,
      desfase: 1,
      incluirHoy: true
    },
    {
      correo: 'caja.santaana@origenes.sv',
      codigo: 'SAN',
      intensidad: 0.5,
      desfase: 2,
      incluirHoy: false
    }
  ];
  for (const caja of cajas) caja.cajero = await Usuario.findOne({ where: { correo: caja.correo } });

  const compras = planDeCompras(contexto);
  const ajustes = planDeAjustes(contexto);
  const pagos = [];

  const diasConVentas = Math.max(6, new Date().getDate() - 1);
  const diasDeReposicion = [];
  for (let dia = 2; dia <= diasConVentas; dia += 7) diasDeReposicion.push(dia);

  for (let dia = Math.max(20, diasConVentas); dia >= 0; dia -= 1) {
    if (diasDeReposicion.includes(dia)) await reabastecer(dia, contexto);

    for (const compra of compras.filter((c) => c.dia === dia)) {
      const { registrada, gerente } = await sembrarCompra(compra);
      if (compra.pago) pagos.push({ ...compra.pago, compra: registrada, gerente });
    }

    for (const pago of pagos.filter((p) => p.dia === dia)) {
      await registrarPago({
        compraId: pago.compra.id,
        usuario: pago.gerente,
        datos: {
          monto: pago.total ? pago.compra.total : pago.monto,
          metodo: pago.metodo,
          fecha: sumarDias(hoy(), -dia),
          referencia: pago.referencia
        }
      });
    }

    if (dia <= diasConVentas) {
      if (dia === diasConVentas || dia % 5 === 0)
        console.log(`Generando ventas: faltan ${dia} días`);
      for (const caja of cajas) {
        if (dia === 0 && !caja.incluirHoy) continue;
        await sembrarVentasDelDia({
          dia,
          cajero: caja.cajero,
          sucursalId: porCodigo.get(caja.codigo).id,
          intensidad: caja.intensidad,
          desfase: caja.desfase,
          productos,
          cliente: clientes[caja.desfase % clientes.length]
        });
      }
    }

    for (const ajuste of ajustes.filter((a) => a.dia === dia)) {
      await sembrarAjuste(ajuste);
    }
  }
}

async function sembrarInventarioInicial() {
  const admin = await Usuario.findOne({ where: { correo: 'admin@origenes.sv' } });
  const existencias = await Existencia.findAll({ include: [Articulo] });
  await MovimientoInventario.bulkCreate(
    existencias.map((existencia) => ({
      articulo_id: existencia.articulo_id,
      sucursal_id: existencia.sucursal_id,
      usuario_id: admin.id,
      tipo: 'ajuste',
      cantidad: existencia.cantidad,
      saldo: existencia.cantidad,
      costo_unitario: existencia.articulo.costo_promedio,
      origen: 'inicial',
      nota: 'Inventario inicial'
    }))
  );
  await bd.query("update movimiento_inventario set creado_en = $1 where origen = 'inicial'", {
    bind: [momento(30, 7)]
  });
}

async function sembrarPlanilla({ porCodigo }) {
  const admin = await Usuario.findOne({ where: { correo: 'admin@origenes.sv' } });
  const ahora = new Date();
  const anterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  for (const codigo of ['ESC', 'STC', 'SAN']) {
    const planilla = await generarPlanilla({
      usuario: admin,
      sucursalId: porCodigo.get(codigo).id,
      anio: anterior.getFullYear(),
      mes: anterior.getMonth() + 1,
      quincena: 2
    });
    await cerrarPlanilla(planilla.id);

    if (ahora.getDate() > 15) {
      const actual = await generarPlanilla({
        usuario: admin,
        sucursalId: porCodigo.get(codigo).id,
        anio: ahora.getFullYear(),
        mes: ahora.getMonth() + 1,
        quincena: 1
      });
      await cerrarPlanilla(actual.id);
    }
  }
}

async function preparar() {
  try {
    await crearBaseSiFalta();
    await bd.sync({ force: true });
    console.log('Tablas creadas');

    const contexto = await sembrarCatalogos();
    console.log('Catálogos cargados');
    await sembrarInventarioInicial();
    await sembrarOperacion(contexto);
    console.log('Compras, ventas, turnos y ajustes de ejemplo registrados');
    await sembrarPlanilla(contexto);
    console.log('Planilla de ejemplo generada');

    console.log(`\nListo. Usuario de prueba: admin@origenes.sv  Contraseña: ${datos.CLAVE_DEMO}`);
    await bd.close();
  } catch (error) {
    console.error('No se pudo preparar la base de datos:', error);
    process.exit(1);
  }
}

preparar();
