import { DataTypes } from 'sequelize';
import bd from '../config/bd.js';
import { ROLES } from '../config/reglas.js';
import { requerido, texto } from './tipos.js';
export const Sucursal = bd.define('sucursal', {
  codigo: { type: DataTypes.STRING(6), allowNull: false, unique: true },
  nombre: requerido(),
  direccion: texto(200),
  municipio: texto(80),
  telefono: texto(20),
  activa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
});
export const Usuario = bd.define(
  'usuario',
  {
    nombre: requerido(),
    correo: {
      type: DataTypes.STRING(120),
      allowNull: false,
      unique: true,
      validate: { isEmail: { msg: 'El correo no es válido' } }
    },
    clave_hash: { type: DataTypes.STRING(100), allowNull: false },
    rol: { type: DataTypes.ENUM(...ROLES), allowNull: false },
    activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  {
    defaultScope: { attributes: { exclude: ['clave_hash'] } },
    scopes: { conClave: { attributes: {} } }
  }
);