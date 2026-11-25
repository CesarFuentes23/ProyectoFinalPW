import { solicitudInvalida } from './errores.js';
export function exigir(cuerpo, campos) {
  const faltantes = campos.filter((campo) => {
    const valor = cuerpo[campo];
    return valor === undefined || valor === null || valor === '';
  });
  if (faltantes.length > 0) {
    throw solicitudInvalida('Faltan datos obligatorios', { faltantes });
     }
}
export function numeroPositivo(valor, nombre, permitirCero = false) {
  const numero = Number(valor);
  const valido = Number.isFinite(numero) && (permitirCero ? numero >= 0 : numero > 0);
  if (!valido) {
    throw solicitudInvalida(
      `${nombre} debe ser un número ${permitirCero ? 'mayor o igual a cero' : 'mayor que cero'}`
    );
  }
  return numero;
}
export function unoDe(valor, opciones, nombre) {
  if (!opciones.includes(valor)) {
    throw solicitudInvalida(`${nombre} debe ser uno de: ${opciones.join(', ')}`);
  }
  return valor;
}
export function listaNoVacia(valor, nombre) {
  if (!Array.isArray(valor) || valor.length === 0) {
    throw solicitudInvalida(`${nombre} debe tener al menos un elemento`);
  }
  return valor;
}
export function tomar(cuerpo, campos) {
  const resultado = {};
  campos.forEach((campo) => {
    if (cuerpo[campo] !== undefined) resultado[campo] = cuerpo[campo];
  });
  return resultado;
}