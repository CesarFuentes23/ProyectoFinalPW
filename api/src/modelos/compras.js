import { DataTypes } from 'sequelize';
import bd from '../config/bd.js';
import { decimal, requerido, texto } from './tipos.js';
export const Proveedor = bd.define('proveedor', {
nombre: { type: DataTypes.STRING(160), allowNull: false, unique: true },
nit: texto(20),
nrc: texto(12),
contacto: texto(120),
telefono: texto(20),
correo: texto(120),
dias_credito: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
export const Compra = bd.define(
'compra',
{
tipo_documento: { type: DataTypes.ENUM('CCF', 'FCF'), allowNull: false },
numero_documento: requerido(30),
fecha: { type: DataTypes.DATEONLY, allowNull: false },
condicion: { type: DataTypes.ENUM('contado', 'credito'), allowNull: false },
vencimiento: { type: DataTypes.DATEONLY },
subtotal: decimal('subtotal'),
iva: decimal('iva'),
total: decimal('total'),
saldo: decimal('saldo'),
estado: {
type: DataTypes.ENUM('pendiente', 'pagada'),
allowNull: false,
defaultValue: 'pendiente'
}
},
{
indexes: [{ unique: true, fields: ['proveedor_id', 'tipo_documento', 'numero_documento'] }]
}
);
export const CompraLinea = bd.define(
'compra_linea',
{
clase: { type: DataTypes.ENUM('costo', 'gasto'), allowNull: false },
descripcion: requerido(),
cantidad: decimal('cantidad', 3),
costo_unitario: decimal('costo_unitario', 4),
total: decimal('total')
},
{ timestamps: false }
);
export const PagoProveedor = bd.define(
'pago_proveedor',
{
fecha: { type: DataTypes.DATEONLY, allowNull: false },
monto: decimal('monto'),
metodo: {
type: DataTypes.ENUM('efectivo', 'transferencia', 'cheque', 'tarjeta'),
allowNull: false
},
referencia: texto(60)
},
{ updatedAt: false }
);
