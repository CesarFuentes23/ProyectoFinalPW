import { DataTypes } from 'sequelize';
import bd from '../config/bd.js';
import { decimal, requerido, texto } from './tipos.js';

export const Empleado = bd.define('empleado', {
  nombres: requerido(80),
  apellidos: requerido(80),
  dui: { type: DataTypes.STRING(10), allowNull: false, unique: true },
  cargo: { type: DataTypes.ENUM('barista', 'cajero', 'gerente', 'cocina', 'administracion'), allowNull: false },
  salario_mensual: decimal('salario_mensual'),
  fecha_ingreso: { type: DataTypes.DATEONLY, allowNull: false },
  afp: { type: DataTypes.ENUM('Crecer', 'Confía'), allowNull: false, defaultValue: 'Crecer' },
  cuenta_banco: texto(30),
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});

export const TramoRenta = bd.define('tramo_renta', {
  periodo: { type: DataTypes.ENUM('quincenal', 'mensual'), allowNull: false },
  tramo: { type: DataTypes.INTEGER, allowNull: false },
  desde: decimal('desde'),
  hasta: decimal('hasta', 2, { allowNull: true, defaultValue: null }),
  porcentaje: decimal('porcentaje', 4),
  sobre_exceso: decimal('sobre_exceso'),
  cuota_fija: decimal('cuota_fija')
}, { timestamps: false });

export const Planilla = bd.define('planilla', {
  anio: { type: DataTypes.INTEGER, allowNull: false },
  mes: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1, max: 12 } },
  quincena: { type: DataTypes.INTEGER, allowNull: false, validate: { isIn: [[1, 2]] } },
  estado: { type: DataTypes.ENUM('borrador', 'cerrada'), allowNull: false, defaultValue: 'borrador' },
  total_devengado: decimal('total_devengado'),
  total_descuentos: decimal('total_descuentos'),
  total_liquido: decimal('total_liquido'),
  total_patronal: decimal('total_patronal'),
  cerrada_en: { type: DataTypes.DATE }
}, {
  indexes: [{ unique: true, fields: ['sucursal_id', 'anio', 'mes', 'quincena'] }]
});

export const PlanillaDetalle = bd.define('planilla_detalle', {
  salario: decimal('salario'),
  horas_extra: decimal('horas_extra'),
  bonificacion: decimal('bonificacion'),
  devengado: decimal('devengado'),
  isss: decimal('isss'),
  afp: decimal('afp'),
  renta: decimal('renta'),
  otros_descuentos: decimal('otros_descuentos'),
  liquido: decimal('liquido'),
  isss_patronal: decimal('isss_patronal'),
  afp_patronal: decimal('afp_patronal')
}, {
  timestamps: false,
  indexes: [{ unique: true, fields: ['planilla_id', 'empleado_id'] }]
});
