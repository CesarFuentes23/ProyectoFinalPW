import jwt from 'jsonwebtoken';
import entorno from '../config/entorno.js';
import { Usuario } from '../modelos/index.js';
import { noAutenticado, sinPermiso, solicitudInvalida } from '../utilidades/errores.js';
export async function autenticar(req, res, next) {
  try {
     const cabecera = req.headers.authorization || '';
    const [tipo, token] = cabecera.split(' ');
    if (tipo !== 'Bearer' || !token) throw noAutenticado();
    let contenido;
    try {
      contenido = jwt.verify(token, entorno.jwt.secreto);
    } catch (error) {
      throw noAutenticado('La sesión venció, vuelve a ingresar');
    }
    const usuario = await Usuario.findByPk(contenido.id);
    if (!usuario || !usuario.activo) throw noAutenticado('El usuario ya no está activo');
    req.usuario = usuario;
    next();
  } catch (error) {
    next(error);
  }
}
export function permitir(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.usuario.rol)) return next(sinPermiso());
    next();
  };
}
export function sucursalDe(req) {
  if (req.usuario.rol !== 'administrador') return req.usuario.sucursal_id;
  const pedida = req.query.sucursal_id || req.body?.sucursal_id || req.usuario.sucursal_id;
  if (!pedida) throw solicitudInvalida('Indica la sucursal');
  return Number(pedida);
}