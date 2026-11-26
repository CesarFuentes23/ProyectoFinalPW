import { Op, fn, col } from 'sequelize';
import {
bd,
Compra,
CompraLinea,
PagoProveedor,
Proveedor,
Articulo,
Existencia,
Sucursal,
Usuario
} from '../../modelos/index.js';
import { agregarIva, redondear } from '../../utilidades/dinero.js';
import { diasEntre, hoy, sumarDias } from '../../utilidades/fechas.js';
import { conflicto, noEncontrado, solicitudInvalida } from '../../utilidades/errores.js';
import { listaNoVacia, numeroPositivo, unoDe } from '../../utilidades/validar.js';
import { moverExistencia } from '../inventario/servicio.js';
const METODOS = ['efectivo', 'transferencia', 'cheque', 'tarjeta'];
async function prepararLineas(lineas, transaccion) {
listaNoVacia(lineas, 'La compra');
const preparadas = [];
for (const linea of lineas) {
const cantidad = numeroPositivo(linea.cantidad, 'La cantidad');
const costoUnitario = numeroPositivo(linea.costo_unitario, 'El costo unitario');
let articulo = null;
if (linea.articulo_id) {
articulo = await Articulo.findByPk(linea.articulo_id, {
transaction: transaccion,
lock: transaccion.LOCK.UPDATE
});
if (!articulo) throw solicitudInvalida('La compra incluye un artículo que no existe');
} else if (!linea.descripcion) {
throw solicitudInvalida('Describe cada gasto que no entra a inventario');
}
preparadas.push({
articulo,
clase: articulo ? 'costo' : 'gasto',
descripcion: articulo ? articulo.nombre : linea.descripcion,
cantidad,
costo_unitario: costoUnitario,
total: redondear(cantidad * costoUnitario)
});
}
return preparadas;
}
async function actualizarCostoPromedio(articulo, cantidad, costoUnitario, transaccion) {
const enBodega = await Existencia.sum('cantidad', {
where: { articulo_id: articulo.id },
transaction: transaccion
});
const previo = Math.max(Number(enBodega) || 0, 0);
const nuevo = (previo * articulo.costo_promedio + cantidad * costoUnitario) / (previo + cantidad);
await articulo.update({ costo_promedio: redondear(nuevo, 4) }, { transaction: transaccion });
}
export async function registrarCompra({ usuario, sucursalId, datos }) {
const compraId = await bd.transaction(async (transaccion) => {
const proveedor = await Proveedor.findByPk(datos.proveedor_id, { transaction: transaccion });
if (!proveedor) throw solicitudInvalida('El proveedor no existe');
const lineas = await prepararLineas(datos.lineas, transaccion);
const suma = lineas.reduce((acumulado, linea) => acumulado + linea.total, 0);
const totales =
datos.tipo_documento === 'CCF'
? agregarIva(suma)
: { subtotal: redondear(suma), iva: 0, total: redondear(suma) };
const alContado = datos.condicion === 'contado';
const vencimiento = alContado
? null
: datos.vencimiento || sumarDias(datos.fecha, proveedor.dias_credito);
const compra = await Compra.create(
{
proveedor_id: proveedor.id,
sucursal_id: sucursalId,
usuario_id: usuario.id,
tipo_documento: datos.tipo_documento,
numero_documento: String(datos.numero_documento).trim(),
fecha: datos.fecha,
condicion: datos.condicion,
vencimiento,
...totales,
saldo: alContado ? 0 : totales.total,
estado: alContado ? 'pagada' : 'pendiente'
},
{ transaction: transaccion }
);
await CompraLinea.bulkCreate(
lineas.map((linea) => ({
compra_id: compra.id,
articulo_id: linea.articulo ? linea.articulo.id : null,
clase: linea.clase,
descripcion: linea.descripcion,
cantidad: linea.cantidad,
costo_unitario: linea.costo_unitario,
total: linea.total
})),
{ transaction: transaccion }
);
for (const linea of lineas.filter((item) => item.articulo)) {
await actualizarCostoPromedio(
linea.articulo,
linea.cantidad,
linea.costo_unitario,
transaccion
);
await moverExistencia(
{
articulo: linea.articulo,
sucursalId,
cantidad: linea.cantidad,
tipo: 'compra',
costoUnitario: linea.costo_unitario,
origen: 'compra',
origenId: compra.id,
usuarioId: usuario.id
},
transaccion
);
}
if (alContado) {
await PagoProveedor.create(
{
compra_id: compra.id,
usuario_id: usuario.id,
fecha: datos.fecha,
monto: totales.total,
metodo: unoDe(datos.metodo_pago || 'efectivo', METODOS, 'El método de pago')
},
{ transaction: transaccion }
);
}
return compra.id;
});
return obtenerCompra(compraId);
}
export async function obtenerCompra(id) {
const compra = await Compra.findByPk(id, {
include: [
{
model: CompraLinea,
as: 'lineas',
include: [{ model: Articulo, attributes: ['nombre', 'unidad'] }]
},
{ model: PagoProveedor, as: 'pagos' },
Proveedor,
Sucursal,
{ model: Usuario, attributes: ['id', 'nombre'] }
]
});
if (!compra) throw noEncontrado('La compra');
return compra;
}
export async function listarCompras(sucursalId, filtros = {}) {
const condicion = {};
if (sucursalId) condicion.sucursal_id = sucursalId;
if (filtros.estado) condicion.estado = filtros.estado;
if (filtros.proveedor_id) condicion.proveedor_id = filtros.proveedor_id;
if (filtros.desde || filtros.hasta) {
condicion.fecha = {};
if (filtros.desde) condicion.fecha[Op.gte] = filtros.desde;
if (filtros.hasta) condicion.fecha[Op.lte] = filtros.hasta;
}
return Compra.findAll({
where: condicion,
include: [
{ model: Proveedor, attributes: ['id', 'nombre'] },
{ model: Sucursal, attributes: ['id', 'nombre'] }
],
order: [
['fecha', 'DESC'],
['id', 'DESC']
],
limit: Math.min(Number(filtros.limite) || 100, 500)
});
}
export async function registrarPago({ compraId, usuario, datos }) {
await bd.transaction(async (transaccion) => {
const compra = await Compra.findByPk(compraId, {
transaction: transaccion,
lock: transaccion.LOCK.UPDATE
});
if (!compra) throw noEncontrado('La compra');
if (compra.estado === 'pagada') throw conflicto('Esta compra ya está pagada');
const monto = redondear(numeroPositivo(datos.monto, 'El monto'));
if (monto > compra.saldo)
    throw solicitudInvalida(`El pago supera el saldo pendiente de $${compra.saldo.toFixed(2)}`);
await PagoProveedor.create(
{
compra_id: compra.id,
usuario_id: usuario.id,
fecha: datos.fecha || hoy(),
monto,
metodo: unoDe(datos.metodo, METODOS, 'El método de pago'),
referencia: datos.referencia || null
},
{ transaction: transaccion }
);
const saldo = redondear(compra.saldo - monto);
await compra.update(
{ saldo, estado: saldo === 0 ? 'pagada' : 'pendiente' },
{ transaction: transaccion }
);
});
return obtenerCompra(compraId);
}
export async function cuentasPorPagar(sucursalId) {
const condicion = { estado: 'pendiente' };
if (sucursalId) condicion.sucursal_id = sucursalId;
const pendientes = await Compra.findAll({
where: condicion,
include: [
{ model: Proveedor, attributes: ['id', 'nombre'] },
{ model: Sucursal, attributes: ['id', 'nombre'] }
],
order: [['vencimiento', 'ASC']]
});
const fechaActual = hoy();
const documentos = pendientes.map((compra) => {
const dias = diasEntre(fechaActual, compra.vencimiento);
return {
id: compra.id,
proveedor: compra.proveedor.nombre,
proveedor_id: compra.proveedor_id,
sucursal: compra.sucursal.nombre,
documento: `${compra.tipo_documento} ${compra.numero_documento}`,
fecha: compra.fecha,
vencimiento: compra.vencimiento,
total: compra.total,
saldo: compra.saldo,
dias_para_vencer: dias,
vencida: dias < 0
};
});
const porProveedor = new Map();
documentos.forEach((documento) => {
const previo = porProveedor.get(documento.proveedor_id) || {
proveedor: documento.proveedor,
saldo: 0,
documentos: 0
};
previo.saldo = redondear(previo.saldo + documento.saldo);
previo.documentos += 1;
porProveedor.set(documento.proveedor_id, previo);
});
return {
total: redondear(documentos.reduce((suma, documento) => suma + documento.saldo, 0)),
vencido: redondear(
documentos
.filter((documento) => documento.vencida)
.reduce((suma, documento) => suma + documento.saldo, 0)
),
por_proveedor: [...porProveedor.values()].sort((a, b) => b.saldo - a.saldo),
documentos
};
}
export async function resumenCostosGastos(sucursalId, desde, hasta) {
const condicion = { fecha: { [Op.between]: [desde, hasta] } };
if (sucursalId) condicion.sucursal_id = sucursalId;
const filas = await CompraLinea.findAll({
attributes: ['clase', [fn('sum', col('compra_linea.total')), 'monto']],
include: [{ model: Compra, attributes: [], where: condicion, required: true }],
group: ['clase'],
raw: true
});
const resumen = { costo: 0, gasto: 0 };
filas.forEach((fila) => {
resumen[fila.clase] = redondear(fila.monto);
});
return { desde, hasta, ...resumen, total: redondear(resumen.costo + resumen.gasto) };
}
