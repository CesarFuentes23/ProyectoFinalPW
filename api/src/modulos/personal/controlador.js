import { Empleado, Sucursal, TramoRenta } from '../../modelos/index.js';
import { sucursalDe } from '../../intermedios/autenticar.js';
import { exigir, numeroPositivo, tomar, unoDe } from '../../utilidades/validar.js';
import { noEncontrado, sinPermiso, solicitudInvalida } from '../../utilidades/errores.js';
import { PLANILLA } from '../../config/reglas.js';
import * as servicio from './servicio.js';

const CAMPOS_EMPLEADO = [
  'nombres',
  'apellidos',
  'dui',
  'cargo',
  'salario_mensual',
  'fecha_ingreso',
  'afp',
  'cuenta_banco',
  'activo',
  'sucursal_id'
];
const CARGOS = ['barista', 'cajero', 'gerente', 'cocina', 'administracion'];

function alcance(req) {
  const todas = req.usuario.rol === 'administrador' && !req.query.sucursal_id;
  return todas ? null : sucursalDe(req);
}

function validarEmpleado(datos) {
  if (datos.cargo !== undefined) unoDe(datos.cargo, CARGOS, 'El cargo');
  if (datos.salario_mensual !== undefined)
    numeroPositivo(datos.salario_mensual, 'El salario mensual');
  if (datos.dui !== undefined && !/^\d{8}-\d$/.test(datos.dui)) {
    throw solicitudInvalida('El DUI debe tener el formato 00000000-0');
  }
}

export async function listarEmpleados(req, res, next) {
  try {
    const sucursalId = alcance(req);
    const empleados = await Empleado.findAll({
      where: sucursalId ? { sucursal_id: sucursalId } : {},
      include: [{ model: Sucursal, attributes: ['id', 'nombre'] }],
      order: [
        ['apellidos', 'ASC'],
        ['nombres', 'ASC']
      ]
    });
    res.json(empleados);
  } catch (error) {
    next(error);
  }
}

export async function crearEmpleado(req, res, next) {
  try {
    exigir(req.body, ['nombres', 'apellidos', 'dui', 'cargo', 'salario_mensual', 'fecha_ingreso']);
    validarEmpleado(req.body);
    const datos = tomar(req.body, CAMPOS_EMPLEADO);
    datos.sucursal_id = sucursalDe(req);
    res.status(201).json(await Empleado.create(datos));
  } catch (error) {
    next(error);
  }
}

export async function actualizarEmpleado(req, res, next) {
  try {
    const empleado = await Empleado.findByPk(req.params.id);
    if (!empleado) throw noEncontrado('El empleado');
    if (req.usuario.rol !== 'administrador' && empleado.sucursal_id !== req.usuario.sucursal_id)
      throw sinPermiso();
    validarEmpleado(req.body);
    const datos = tomar(req.body, CAMPOS_EMPLEADO);
    if (req.usuario.rol !== 'administrador') delete datos.sucursal_id;
    await empleado.update(datos);
    res.json(empleado);
  } catch (error) {
    next(error);
  }
}

export async function reglasDePlanilla(req, res, next) {
  try {
    const tramos = await TramoRenta.findAll({
      where: { periodo: 'quincenal' },
      order: [['tramo', 'ASC']]
    });
    res.json({ ...PLANILLA, tramos });
  } catch (error) {
    next(error);
  }
}

export async function listarPlanillas(req, res, next) {
  try {
    res.json(await servicio.listarPlanillas(alcance(req)));
  } catch (error) {
    next(error);
  }
}

export async function crearPlanilla(req, res, next) {
  try {
    exigir(req.body, ['anio', 'mes', 'quincena']);
    const planilla = await servicio.generarPlanilla({
      usuario: req.usuario,
      sucursalId: sucursalDe(req),
      anio: Number(req.body.anio),
      mes: Number(req.body.mes),
      quincena: Number(req.body.quincena)
    });
    res.status(201).json(planilla);
  } catch (error) {
    next(error);
  }
}

async function planillaPermitida(req) {
  const planilla = await servicio.obtenerPlanilla(req.params.id);
  if (req.usuario.rol !== 'administrador' && planilla.sucursal_id !== req.usuario.sucursal_id)
    throw sinPermiso();
  return planilla;
}

export async function obtenerPlanilla(req, res, next) {
  try {
    res.json(await planillaPermitida(req));
  } catch (error) {
    next(error);
  }
}

export async function ajustarDetalle(req, res, next) {
  try {
    await planillaPermitida(req);
    res.json(
      await servicio.ajustarDetalle({
        planillaId: req.params.id,
        detalleId: req.params.detalleId,
        datos: req.body
      })
    );
  } catch (error) {
    next(error);
  }
}

export async function cerrarPlanilla(req, res, next) {
  try {
    await planillaPermitida(req);
    res.status(201).json(await servicio.cerrarPlanilla(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function eliminarPlanilla(req, res, next) {
  try {
    await planillaPermitida(req);
    await servicio.eliminarPlanilla(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}
