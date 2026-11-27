import { ErrorApi } from '../utilidades/errores.js';

export function rutaDesconocida(req, res) {
  res.status(404).json({ mensaje: `No existe ${req.method} ${req.originalUrl}` });
}

export function manejarErrores(error, req, res, next) {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido' });
  }
  if (error instanceof ErrorApi) {
    return res.status(error.estado).json({ mensaje: error.message, detalle: error.detalle });
  }
  if (error.name === 'SequelizeUniqueConstraintError') {
    const campos = Object.keys(error.fields || {});
    return res
      .status(409)
      .json({ mensaje: 'Ya existe un registro con esos datos', detalle: { campos } });
  }
  if (error.name === 'SequelizeValidationError') {
    const mensajes = error.errors.map((e) => e.message);
    return res.status(400).json({ mensaje: 'Datos no válidos', detalle: { mensajes } });
  }
  if (error.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({ mensaje: 'El registro está relacionado con otros datos' });
  }
  if (error.name === 'SequelizeDatabaseError' && error.parent?.code === '22P02') {
    return res
      .status(400)
      .json({ mensaje: 'Uno de los datos enviados no tiene el formato correcto' });
  }
  console.error(error);
  res.status(500).json({ mensaje: 'Ocurrió un error inesperado en el servidor' });
}
