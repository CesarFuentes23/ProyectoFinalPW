import bd from '../config/bd.js';
import { Sucursal, Usuario } from './organizacion.js';
import {
  Articulo,
  Existencia,
  MovimientoInventario,
  Producto,
  ComponenteReceta
} from './catalogo.js';
import { Cliente, Correlativo, Venta, VentaLinea, VentaPago } from './ventas.js';
import { Proveedor, PrecioProveedor, Compra, CompraLinea, PagoProveedor } from './compras.js';
import { TurnoCaja, MovimientoCaja } from './caja.js';
import { Empleado, TramoRenta, Planilla, PlanillaDetalle } from './personal.js';

const obligatoria = (nombre) => ({ foreignKey: { name: nombre, allowNull: false } });
const opcional = (nombre) => ({ foreignKey: { name: nombre, allowNull: true } });

Sucursal.hasMany(Usuario, opcional('sucursal_id'));
Usuario.belongsTo(Sucursal, opcional('sucursal_id'));
Empleado.hasOne(Usuario, opcional('empleado_id'));
Usuario.belongsTo(Empleado, opcional('empleado_id'));

Articulo.hasMany(Existencia, obligatoria('articulo_id'));
Existencia.belongsTo(Articulo, obligatoria('articulo_id'));
Sucursal.hasMany(Existencia, obligatoria('sucursal_id'));
Existencia.belongsTo(Sucursal, obligatoria('sucursal_id'));

MovimientoInventario.belongsTo(Articulo, obligatoria('articulo_id'));
MovimientoInventario.belongsTo(Sucursal, obligatoria('sucursal_id'));
MovimientoInventario.belongsTo(Usuario, obligatoria('usuario_id'));

Producto.hasMany(ComponenteReceta, {
  as: 'receta',
  foreignKey: { name: 'producto_id', allowNull: false },
  onDelete: 'CASCADE'
});
ComponenteReceta.belongsTo(Producto, obligatoria('producto_id'));
ComponenteReceta.belongsTo(Articulo, obligatoria('articulo_id'));
Articulo.hasMany(ComponenteReceta, obligatoria('articulo_id'));

Correlativo.belongsTo(Sucursal, obligatoria('sucursal_id'));

Venta.belongsTo(Sucursal, obligatoria('sucursal_id'));
Venta.belongsTo(Usuario, obligatoria('usuario_id'));
Venta.belongsTo(TurnoCaja, { as: 'turno', foreignKey: { name: 'turno_id', allowNull: false } });
TurnoCaja.hasMany(Venta, { as: 'ventas', foreignKey: { name: 'turno_id', allowNull: false } });
Venta.belongsTo(Cliente, opcional('cliente_id'));
Venta.hasMany(VentaLinea, {
  as: 'lineas',
  foreignKey: { name: 'venta_id', allowNull: false },
  onDelete: 'CASCADE'
});
VentaLinea.belongsTo(Venta, obligatoria('venta_id'));
VentaLinea.belongsTo(Producto, obligatoria('producto_id'));
Venta.hasMany(VentaPago, {
  as: 'pagos',
  foreignKey: { name: 'venta_id', allowNull: false },
  onDelete: 'CASCADE'
});
VentaPago.belongsTo(Venta, obligatoria('venta_id'));

Proveedor.hasMany(PrecioProveedor, {
  as: 'catalogo',
  foreignKey: { name: 'proveedor_id', allowNull: false },
  onDelete: 'CASCADE'
});
PrecioProveedor.belongsTo(Proveedor, obligatoria('proveedor_id'));
PrecioProveedor.belongsTo(Articulo, obligatoria('articulo_id'));

Compra.belongsTo(Proveedor, obligatoria('proveedor_id'));
Proveedor.hasMany(Compra, obligatoria('proveedor_id'));
Compra.belongsTo(Sucursal, obligatoria('sucursal_id'));
Compra.belongsTo(Usuario, obligatoria('usuario_id'));
Compra.hasMany(CompraLinea, {
  as: 'lineas',
  foreignKey: { name: 'compra_id', allowNull: false },
  onDelete: 'CASCADE'
});
CompraLinea.belongsTo(Compra, obligatoria('compra_id'));
CompraLinea.belongsTo(Articulo, opcional('articulo_id'));
Compra.hasMany(PagoProveedor, {
  as: 'pagos',
  foreignKey: { name: 'compra_id', allowNull: false },
  onDelete: 'CASCADE'
});
PagoProveedor.belongsTo(Compra, obligatoria('compra_id'));
PagoProveedor.belongsTo(Usuario, obligatoria('usuario_id'));

TurnoCaja.belongsTo(Sucursal, obligatoria('sucursal_id'));
TurnoCaja.belongsTo(Usuario, obligatoria('usuario_id'));
TurnoCaja.hasMany(MovimientoCaja, {
  as: 'movimientos',
  foreignKey: { name: 'turno_id', allowNull: false },
  onDelete: 'CASCADE'
});
MovimientoCaja.belongsTo(TurnoCaja, obligatoria('turno_id'));

Empleado.belongsTo(Sucursal, obligatoria('sucursal_id'));
Sucursal.hasMany(Empleado, obligatoria('sucursal_id'));
Planilla.belongsTo(Sucursal, obligatoria('sucursal_id'));
Planilla.belongsTo(Usuario, obligatoria('usuario_id'));
Planilla.hasMany(PlanillaDetalle, {
  as: 'detalles',
  foreignKey: { name: 'planilla_id', allowNull: false },
  onDelete: 'CASCADE'
});
PlanillaDetalle.belongsTo(Planilla, obligatoria('planilla_id'));
PlanillaDetalle.belongsTo(Empleado, obligatoria('empleado_id'));

export {
  bd,
  Sucursal,
  Usuario,
  Articulo,
  Existencia,
  MovimientoInventario,
  Producto,
  ComponenteReceta,
  Cliente,
  Correlativo,
  Venta,
  VentaLinea,
  VentaPago,
  Proveedor,
  PrecioProveedor,
  Compra,
  CompraLinea,
  PagoProveedor,
  TurnoCaja,
  MovimientoCaja,
  Empleado,
  TramoRenta,
  Planilla,
  PlanillaDetalle
};
