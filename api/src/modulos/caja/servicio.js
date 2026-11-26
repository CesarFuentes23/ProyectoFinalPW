import {
  bd,
  TurnoCaja,
  MovimientoCaja,
  Venta,
  VentaPago,
  Sucursal,
  Usuario
} from '../../modelos/index.js';
import { redondear } from '../../utilidades/dinero.js';
import { conflicto, noEncontrado, sinPermiso } from '../../utilidades/errores.js';
import { numeroPositivo, unoDe } from '../../utilidades/validar.js';

export async function calcularResumen(turno, transaccion = null) {
  const [ventas, movimientos] = await Promise.all([
    Venta.findAll({
      where: { turno_id: turno.id },
      include: [{ model: VentaPago, as: 'pagos' }],
      transaction: transaccion
    }),
    MovimientoCaja.findAll({
      where: { turno_id: turno.id },
      order: [['id', 'ASC']],
      transaction: transaccion
    })
  ]);

  const emitidas = ventas.filter((venta) => venta.estado === 'emitida');
  const cobrado = { efectivo: 0, tarjeta: 0, bitcoin: 0 };
  emitidas.forEach((venta) => {
    venta.pagos.forEach((pago) => {
      cobrado[pago.metodo] = redondear(cobrado[pago.metodo] + pago.monto);
    });
  });

  const ingresos = redondear(
    movimientos.filter((m) => m.tipo === 'ingreso').reduce((suma, m) => suma + m.monto, 0)
  );
  const retiros = redondear(
    movimientos.filter((m) => m.tipo === 'retiro').reduce((suma, m) => suma + m.monto, 0)
  );

  return {
    ventas: emitidas.length,
    anuladas: ventas.length - emitidas.length,
    total_vendido: redondear(emitidas.reduce((suma, venta) => suma + venta.total, 0)),
    cobrado,
    ingresos,
    retiros,
    esperado: {
      efectivo: redondear(turno.fondo_inicial + cobrado.efectivo + ingresos - retiros),
      tarjeta: cobrado.tarjeta,
      bitcoin: cobrado.bitcoin
    },
    movimientos
  };
}

function presentar(turno, resumen) {
  const datos = turno.toJSON();
  if (turno.estado === 'cerrado') {
    datos.diferencia = {
      efectivo: redondear(turno.contado_efectivo - turno.esperado_efectivo),
      tarjeta: redondear(turno.contado_tarjeta - turno.esperado_tarjeta),
      bitcoin: redondear(turno.contado_bitcoin - turno.esperado_bitcoin)
    };
  }
  return { ...datos, resumen };
}

export async function abrirTurno({ usuario, sucursalId, fondoInicial }) {
  const abierto = await TurnoCaja.findOne({
    where: { usuario_id: usuario.id, sucursal_id: sucursalId, estado: 'abierto' }
  });
  if (abierto) throw conflicto('Ya tienes una caja abierta en esta sucursal');

  const turno = await TurnoCaja.create({
    usuario_id: usuario.id,
    sucursal_id: sucursalId,
    fondo_inicial: numeroPositivo(fondoInicial, 'El fondo inicial', true)
  });
  return presentar(turno, await calcularResumen(turno));
}

export async function turnoActual({ usuario, sucursalId }) {
  const turno = await TurnoCaja.findOne({
    where: { usuario_id: usuario.id, sucursal_id: sucursalId, estado: 'abierto' },
    include: [Sucursal, { model: Usuario, attributes: ['id', 'nombre'] }]
  });
  if (!turno) return null;
  return presentar(turno, await calcularResumen(turno));
}

async function buscarTurno(id, usuario, transaccion = null) {
  const turno = await TurnoCaja.findByPk(id, {
    include: [Sucursal, { model: Usuario, attributes: ['id', 'nombre'] }],
    transaction: transaccion
  });
  if (!turno) throw noEncontrado('El turno de caja');
  const esJefatura =
    usuario.rol === 'administrador' ||
    (usuario.rol === 'gerente' && usuario.sucursal_id === turno.sucursal_id);
  if (!esJefatura && turno.usuario_id !== usuario.id)
    throw sinPermiso('Este turno pertenece a otra persona');
  return turno;
}

export async function obtenerTurno(id, usuario) {
  const turno = await buscarTurno(id, usuario);
  return presentar(turno, await calcularResumen(turno));
}

export async function registrarMovimiento({ id, usuario, datos }) {
  const turno = await buscarTurno(id, usuario);
  if (turno.estado !== 'abierto') throw conflicto('El turno ya está cerrado');

  await MovimientoCaja.create({
    turno_id: turno.id,
    tipo: unoDe(datos.tipo, ['ingreso', 'retiro'], 'El tipo'),
    monto: redondear(numeroPositivo(datos.monto, 'El monto')),
    motivo: datos.motivo
  });
  return presentar(turno, await calcularResumen(turno));
}

export async function cerrarTurno({ id, usuario, datos }) {
  await bd.transaction(async (transaccion) => {
    const turno = await buscarTurno(id, usuario, transaccion);
    if (turno.estado !== 'abierto') throw conflicto('El turno ya está cerrado');

    const resumen = await calcularResumen(turno, transaccion);
    await turno.update(
      {
        estado: 'cerrado',
        cerrado_en: new Date(),
        esperado_efectivo: resumen.esperado.efectivo,
        esperado_tarjeta: resumen.esperado.tarjeta,
        esperado_bitcoin: resumen.esperado.bitcoin,
        contado_efectivo: redondear(
          numeroPositivo(datos.contado_efectivo, 'El efectivo contado', true)
        ),
        contado_tarjeta: redondear(
          numeroPositivo(datos.contado_tarjeta, 'El total de tarjetas', true)
        ),
        contado_bitcoin: redondear(
          numeroPositivo(datos.contado_bitcoin, 'El total en Bitcoin', true)
        ),
        observacion: datos.observacion || null
      },
      { transaction: transaccion }
    );
  });
  return obtenerTurno(id, usuario);
}

export async function listarTurnos(sucursalId, filtros = {}) {
  const condicion = {};
  if (sucursalId) condicion.sucursal_id = sucursalId;
  if (filtros.estado) condicion.estado = filtros.estado;
  const turnos = await TurnoCaja.findAll({
    where: condicion,
    include: [
      { model: Sucursal, attributes: ['id', 'nombre'] },
      { model: Usuario, attributes: ['id', 'nombre'] }
    ],
    order: [['id', 'DESC']],
    limit: Math.min(Number(filtros.limite) || 60, 200)
  });
  return turnos.map((turno) => presentar(turno, undefined));
}
