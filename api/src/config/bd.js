import { Sequelize } from 'sequelize';
import entorno from './entorno.js';
const bd = new Sequelize(entorno.bd.nombre, entorno.bd.usuario, entorno.bd.clave, {
  host: entorno.bd.host,
  port: entorno.bd.puerto,
  dialect: 'postgres',
  logging: false,
  define: {
    underscored: true,
    freezeTableName: true,
    createdAt: 'creado_en',
    updatedAt: 'actualizado_en'
  }
});
export default bd;