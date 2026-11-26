import { IVA } from '../config/reglas.js';
export function redondear(valor, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round((Number(valor) + Number.EPSILON) * factor) / factor;
}
export function desglosarIva(totalConIva) {
  const total = redondear(totalConIva);
  const subtotal = redondear(total / (1 + IVA));
  const iva = redondear(total - subtotal);
  return { subtotal, iva, total };
}
export function agregarIva(subtotalSinIva) {
  const subtotal = redondear(subtotalSinIva);
  const iva = redondear(subtotal * IVA);
  return { subtotal, iva, total: redondear(subtotal + iva) };
}
export function sumar(lista, obtener) {
  return redondear(
    lista.reduce((acumulado, elemento) => acumulado + Number(obtener(elemento)), 0),
    4
  );
}