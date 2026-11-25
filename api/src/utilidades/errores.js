export class ErrorApi extends Error {
  constructor(estado, mensaje, detalle = null) {
    super(mensaje);
    this.estado = estado;
    this.detalle = detalle;
  }
}
export const solicitudInvalida = (mensaje, detalle) => new ErrorApi(400, mensaje, detalle);
export const noAutenticado = (mensaje = 'Inicia sesión para continuar') =>
  new ErrorApi(401, mensaje);
export const sinPermiso = (mensaje = 'Tu rol no permite esta acción') => new ErrorApi(403, mensaje);
export const noEncontrado = (recurso) => new ErrorApi(404, `${recurso} no existe`);
export const conflicto = (mensaje, detalle) => new ErrorApi(409, mensaje, detalle);