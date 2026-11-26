import { DataTypes } from 'sequelize';
import bd from '../config/bd.js';
import { decimal, texto } from './tipos.js';

const opcional = (nombre) => decimal(nombre, 2, { allowNull: true, defaultValue: null });

export const TurnoCaja = bd.define('turno_caja', {
  abierto_en: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  cerrado_en: { type: DataTypes.DATE },
  fondo_inicial: decimal('fondo_inicial'),
  estado: { type: DataTypes.ENUM('abierto', 'cerrado'), allowNull: false, defaultValue: 'abierto' },
  esperado_efectivo: opcional('esperado_efectivo'),
  esperado_tarjeta: opcional('esperado_tarjeta'),
  esperado_bitcoin: opcional('esperado_bitcoin'),
  contado_efectivo: opcional('contado_efectivo'),
  contado_tarjeta: opcional('contado_tarjeta'),
  contado_bitcoin: opcional('contado_bitcoin'),
  observacion: texto(240)
});
export const MovimientoCaja = bd.define(
  'movimiento_caja',
  {
    tipo: { type: DataTypes.ENUM('ingreso', 'retiro'), allowNull: false },
    monto: decimal('monto'),
    motivo: { type: DataTypes.STRING(160), allowNull: false }
  },
  { updatedAt: false }
);
