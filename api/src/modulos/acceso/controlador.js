import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import entorno from '../../config/entorno.js';
import {
  Usuario,
  Sucursal
} from '../../modelos/index.js';
import {
  exigir
} from '../../utilidades/validar.js';
import {
  noAutenticado,
  solicitudInvalida
} from '../../utilidades/errores.js';
const FORMATO_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function presentar(usuario) {
  return {
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.rol,
    sucursal_id: usuario.sucursal_id,
    sucursal: usuario.sucursal ?
      {
        id: usuario.sucursal.id,
        nombre: usuario.sucursal.nombre,
        codigo: usuario.sucursal.codigo
      } :
      null
  };
}
export async function iniciarSesion(req, res, next) {
  try {
    exigir(req.body, ['correo', 'clave']);
    const correo = String(req.body.correo).trim().toLowerCase();
    if (!FORMATO_CORREO.test(correo))
      throw solicitudInvalida('El correo no tiene un formato válido');
    const usuario = await Usuario.scope('conClave').findOne({
      where: {
        correo
      },
      include: Sucursal
    });
    const claveCorrecta = usuario ?
      await bcrypt.compare(String(req.body.clave), usuario.clave_hash) :
      false;
    if (!usuario || !claveCorrecta || !usuario.activo)
      throw noAutenticado('Correo o contraseña incorrectos');
    const token = jwt.sign({
      id: usuario.id,
      rol: usuario.rol
    }, entorno.jwt.secreto, {
      expiresIn: entorno.jwt.duracion
    });
    res.status(201).json({
      token,
      usuario: presentar(usuario)
    });
  } catch (error) {
    next(error);
  }
}
export async function sesionActual(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      include: Sucursal
    });
    res.json(presentar(usuario));
  } catch (error) {
    next(error);
  }
}