export function fechaLocal(momento) {
  const fecha = new Date(momento);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}
export function hoy() {
  return fechaLocal(new Date());
}
export function sumarDias(fecha, dias) {
  const base = new Date(`${fecha}T12:00:00`);
  base.setDate(base.getDate() + dias);
  return base.toISOString().slice(0, 10);
}
export function diasEntre(desde, hasta) {
  const inicio = new Date(`${desde}T12:00:00`);
  const fin = new Date(`${hasta}T12:00:00`);
  return Math.round((fin - inicio) / 86400000);
}
export function inicioDelDia(fecha = hoy()) {
  return new Date(`${fecha}T00:00:00`);
}
export function finDelDia(fecha = hoy()) {
  return new Date(`${fecha}T23:59:59.999`);
}