import { Proveedor } from '../../modelos/index.js';
import { sucursalDe } from '../../intermedios/autenticar.js';
import { exigir, tomar, unoDe } from '../../utilidades/validar.js';
import { noEncontrado } from '../../utilidades/errores.js';
import { hoy } from '../../utilidades/fechas.js';
import * as servicio from './servicio.js';
const CAMPOS_PROVEEDOR = [
'nombre',
'nit',
'nrc',
'contacto',
'telefono',
'correo',
'dias_credito',
'activo'
];
async function compraPermitida(req) {
const compra = await servicio.obtenerCompra(req.params.id);
if (req.usuario.rol !== 'administrador' && compra.sucursal_id !== req.usuario.sucursal_id)
throw noEncontrado('La compra');
return compra;
}
function alcance(req) {
const todas = req.usuario.rol === 'administrador' && !req.query.sucursal_id;
return todas ? null : sucursalDe(req);
}
export async function listarProveedores(req, res, next) {
try {
res.json(await Proveedor.findAll({ order: [['nombre', 'ASC']] }));
} catch (error) {
next(error);
}
}
export async function crearProveedor(req, res, next) {
try {
exigir(req.body, ['nombre']);
res.status(201).json(await Proveedor.create(tomar(req.body, CAMPOS_PROVEEDOR)));
} catch (error) {
next(error);
}
}
export async function actualizarProveedor(req, res, next) {
try {
const proveedor = await Proveedor.findByPk(req.params.id);
if (!proveedor) throw noEncontrado('El proveedor');
await proveedor.update(tomar(req.body, CAMPOS_PROVEEDOR));
res.json(proveedor);
} catch (error) {
next(error);
}
}
export async function listarCompras(req, res, next) {
try {
res.json(await servicio.listarCompras(alcance(req), req.query));
} catch (error) {
next(error);
}
}
export async function obtenerCompra(req, res, next) {
try {
res.json(await compraPermitida(req));
} catch (error) {
next(error);
}
}
export async function crearCompra(req, res, next) {
try {
exigir(req.body, [
'proveedor_id',
'tipo_documento',
'numero_documento',
'fecha',
'condicion',
'lineas'
]);
unoDe(req.body.tipo_documento, ['CCF', 'FCF'], 'El tipo de documento');
unoDe(req.body.condicion, ['contado', 'credito'], 'La condición');
const compra = await servicio.registrarCompra({
usuario: req.usuario,
sucursalId: sucursalDe(req),
datos: req.body
});
res.status(201).json(compra);
} catch (error) {
next(error);
}
}
export async function crearPago(req, res, next) {
try {
exigir(req.body, ['monto', 'metodo']);
await compraPermitida(req);
const compra = await servicio.registrarPago({
compraId: req.params.id,
usuario: req.usuario,
datos: req.body
});
res.status(201).json(compra);
} catch (error) {
next(error);
}
}
export async function cuentasPorPagar(req, res, next) {
try {
res.json(await servicio.cuentasPorPagar(alcance(req)));
} catch (error) {
next(error);
}
}
export async function resumen(req, res, next) {
try {
const hasta = req.query.hasta || hoy();
const desde = req.query.desde || `${hasta.slice(0, 8)}01`;
res.json(await servicio.resumenCostosGastos(alcance(req), desde, hasta));
} catch (error) {
next(error);
}
}
