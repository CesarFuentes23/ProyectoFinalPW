import { DataTypes } from 'sequelize';
import bd from '../config/bd.js';
import { decimal, requerido, texto } from './tipos.js';

export const Articulo = bd.define('articulo', {
  nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  tipo: { type: DataTypes.ENUM('insumo', 'empaque', 'reventa'), allowNull: false },
  unidad: { type: DataTypes.ENUM('g', 'ml', 'unidad'), allowNull: false },
  costo_promedio: decimal('costo_promedio', 4),
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});

export const Existencia = bd.define(
  'existencia',
  {
    cantidad: decimal('cantidad', 3),
    minimo: decimal('minimo', 3)
  },
  {
    indexes: [{ unique: true, fields: ['articulo_id', 'sucursal_id'] }]
  }
);

export const MovimientoInventario = bd.define(
  'movimiento_inventario',
  {
    tipo: {
      type: DataTypes.ENUM('compra', 'venta', 'anulacion', 'ajuste', 'merma'),
      allowNull: false
    },
    cantidad: decimal('cantidad', 3),
    saldo: decimal('saldo', 3),
    costo_unitario: decimal('costo_unitario', 4),
    origen: texto(40),
    origen_id: { type: DataTypes.INTEGER },
    nota: texto(200)
  },
  { updatedAt: false }
);

export const Producto = bd.define('producto', {
  nombre: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  categoria: requerido(40),
  tipo: { type: DataTypes.ENUM('elaborado', 'reventa'), allowNull: false },
  precio: decimal('precio'),
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});

export const ComponenteReceta = bd.define(
  'componente_receta',
  {
    cantidad: decimal('cantidad', 3)
  },
  {
    timestamps: false,
    indexes: [{ unique: true, fields: ['producto_id', 'articulo_id'] }]
  }
);
