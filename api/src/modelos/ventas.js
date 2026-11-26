import { DataTypes } from 'sequelize';
import bd from '../config/bd.js';
import { METODOS_PAGO, TIPOS_DOCUMENTO } from '../config/reglas.js';
import { decimal, requerido, texto } from './tipos.js';

export const Cliente = bd.define('cliente', {
  nombre: requerido(160),
  nit: texto(20),
  nrc: texto(12),
  giro: texto(160),
  direccion: texto(200),
  correo: texto(120)
});

export const Correlativo = bd.define(
  'correlativo',
  {
    tipo_documento: { type: DataTypes.ENUM(...TIPOS_DOCUMENTO), allowNull: false },
    siguiente: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
  },
  {
    indexes: [{ unique: true, fields: ['sucursal_id', 'tipo_documento'] }]
  }
);

export const Venta = bd.define('venta', {
  tipo_documento: { type: DataTypes.ENUM(...TIPOS_DOCUMENTO), allowNull: false },
  correlativo: { type: DataTypes.INTEGER, allowNull: false },
  numero: { type: DataTypes.STRING(24), allowNull: false, unique: true },
  fecha: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  subtotal: decimal('subtotal'),
  iva: decimal('iva'),
  total: decimal('total'),
  costo: decimal('costo', 4),
  efectivo_recibido: decimal('efectivo_recibido'),
  cambio: decimal('cambio'),
  estado: { type: DataTypes.ENUM('emitida', 'anulada'), allowNull: false, defaultValue: 'emitida' },
  motivo_anulacion: texto(200)
});

export const VentaLinea = bd.define(
  'venta_linea',
  {
    descripcion: requerido(),
    cantidad: decimal('cantidad', 0),
    precio_unitario: decimal('precio_unitario'),
    total: decimal('total'),
    costo: decimal('costo', 4)
  },
  { timestamps: false }
);

export const VentaPago = bd.define(
  'venta_pago',
  {
    metodo: { type: DataTypes.ENUM(...METODOS_PAGO), allowNull: false },
    monto: decimal('monto'),
    referencia: texto(60)
  },
  { timestamps: false }
);
