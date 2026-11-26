import { Op } from 'sequelize';
import {
  bd,
  Empleado,
  Planilla,
  PlanillaDetalle,
  TramoRenta,
  Sucursal,
  Usuario
} from '../../modelos/index.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../../utilidades/errores.js';
import { numeroPositivo } from '../../utilidades/validar.js';
import { calcularBoleta, totalizar } from './calculos.js';

const detalleCompleto = [
  {
    model: PlanillaDetalle,
    as: 'detalles',
    include: [
      {
        model: Empleado,
        attributes: ['id', 'nombres', 'apellidos', 'dui', 'cargo', 'afp', 'cuenta_banco']
      }
    ]
  },
  { model: Sucursal, attributes: ['id', 'nombre', 'codigo'] },
  { model: Usuario, attributes: ['id', 'nombre'] }
];

function finDeQuincena(anio, mes, quincena) {
  const dia = quincena === 1 ? 15 : new Date(anio, mes, 0).getDate();
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

async function tramosQuincenales(transaccion) {
  const tramos = await TramoRenta.findAll({
    where: { periodo: 'quincenal' },
    order: [['tramo', 'ASC']],
    transaction: transaccion
  });
  if (tramos.length === 0) throw conflicto('No hay tabla de retención de renta cargada');
  return tramos;
}

export async function generarPlanilla({ usuario, sucursalId, anio, mes, quincena }) {
  if (![1, 2].includes(quincena)) throw solicitudInvalida('La quincena debe ser 1 o 2');
  if (mes < 1 || mes > 12) throw solicitudInvalida('El mes debe estar entre 1 y 12');

  const planillaId = await bd.transaction(async (transaccion) => {
    const existente = await Planilla.findOne({
      where: { sucursal_id: sucursalId, anio, mes, quincena },
      transaction: transaccion
    });
    if (existente) throw conflicto('Ya existe la planilla de esa quincena para esta sucursal');

    const empleados = await Empleado.findAll({
      where: {
        sucursal_id: sucursalId,
        activo: true,
        fecha_ingreso: { [Op.lte]: finDeQuincena(anio, mes, quincena) }
      },
      transaction: transaccion
    });
    if (empleados.length === 0)
      throw conflicto('La sucursal no tiene empleados activos en esa quincena');

    const tramos = await tramosQuincenales(transaccion);
    const boletas = empleados.map((empleado) => ({
      empleado_id: empleado.id,
      ...calcularBoleta({ salarioMensual: empleado.salario_mensual }, tramos)
    }));

    const planilla = await Planilla.create(
      {
        sucursal_id: sucursalId,
        usuario_id: usuario.id,
        anio,
        mes,
        quincena,
        ...totalizar(boletas)
      },
      { transaction: transaccion }
    );

    await PlanillaDetalle.bulkCreate(
      boletas.map((boleta) => ({ ...boleta, planilla_id: planilla.id })),
      { transaction: transaccion }
    );
    return planilla.id;
  });

  return obtenerPlanilla(planillaId);
}

export async function obtenerPlanilla(id) {
  const planilla = await Planilla.findByPk(id, {
    include: detalleCompleto,
    order: [[{ model: PlanillaDetalle, as: 'detalles' }, Empleado, 'apellidos', 'ASC']]
  });
  if (!planilla) throw noEncontrado('La planilla');
  return planilla;
}

export async function listarPlanillas(sucursalId) {
  const condicion = sucursalId ? { sucursal_id: sucursalId } : {};
  return Planilla.findAll({
    where: condicion,
    include: [{ model: Sucursal, attributes: ['id', 'nombre'] }],
    order: [
      ['anio', 'DESC'],
      ['mes', 'DESC'],
      ['quincena', 'DESC']
    ]
  });
}

export async function ajustarDetalle({ planillaId, detalleId, datos }) {
  await bd.transaction(async (transaccion) => {
    const planilla = await Planilla.findByPk(planillaId, {
      transaction: transaccion,
      lock: transaccion.LOCK.UPDATE
    });
    if (!planilla) throw noEncontrado('La planilla');
    if (planilla.estado === 'cerrada')
      throw conflicto('La planilla está cerrada y ya no admite cambios');

    const detalle = await PlanillaDetalle.findOne({
      where: { id: detalleId, planilla_id: planillaId },
      include: [Empleado],
      transaction: transaccion
    });
    if (!detalle) throw noEncontrado('La boleta');

    const tramos = await tramosQuincenales(transaccion);
    const boleta = calcularBoleta(
      {
        salarioMensual: detalle.empleado.salario_mensual,
        horasExtra: numeroPositivo(
          datos.horas_extra ?? detalle.horas_extra,
          'Las horas extra',
          true
        ),
        bonificacion: numeroPositivo(
          datos.bonificacion ?? detalle.bonificacion,
          'La bonificación',
          true
        ),
        otrosDescuentos: numeroPositivo(
          datos.otros_descuentos ?? detalle.otros_descuentos,
          'Los otros descuentos',
          true
        )
      },
      tramos
    );
    if (boleta.liquido < 0) throw solicitudInvalida('Los descuentos superan lo devengado');

    await detalle.update(boleta, { transaction: transaccion });
    const detalles = await PlanillaDetalle.findAll({
      where: { planilla_id: planillaId },
      transaction: transaccion
    });
    await planilla.update(totalizar(detalles), { transaction: transaccion });
  });
  return obtenerPlanilla(planillaId);
}

export async function cerrarPlanilla(id) {
  const planilla = await Planilla.findByPk(id);
  if (!planilla) throw noEncontrado('La planilla');
  if (planilla.estado === 'cerrada') throw conflicto('La planilla ya estaba cerrada');
  await planilla.update({ estado: 'cerrada', cerrada_en: new Date() });
  return obtenerPlanilla(id);
}

export async function eliminarPlanilla(id) {
  const planilla = await Planilla.findByPk(id);
  if (!planilla) throw noEncontrado('La planilla');
  if (planilla.estado === 'cerrada') throw conflicto('Una planilla cerrada no se puede eliminar');
  await planilla.destroy();
}
