const formatoDinero = new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' });
const formatoFecha = new Intl.DateTimeFormat('es-SV', {
  day: '2-digit',
  month: 'short',
  year: 'numeric'
});
const formatoHora = new Intl.DateTimeFormat('es-SV', { hour: '2-digit', minute: '2-digit' });
const formatoDia = new Intl.DateTimeFormat('es-SV', { weekday: 'short' });

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre'
];

export const NOMBRE_METODO = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', bitcoin: 'Bitcoin' };
export const NOMBRE_DOCUMENTO = {
  FCF: 'Factura de consumidor final',
  CCF: 'Comprobante de crédito fiscal'
};
export const NOMBRE_ROL = {
  administrador: 'Administración',
  gerente: 'Gerencia',
  cajero: 'Caja',
  barista: 'Barra'
};

export function dinero(valor) {
  return formatoDinero.format(Number(valor) || 0);
}

function comoFecha(valor) {
  if (typeof valor === 'string' && valor.length === 10) return new Date(`${valor}T12:00:00`);
  return new Date(valor);
}

export function fecha(valor) {
  return valor ? formatoFecha.format(comoFecha(valor)) : '';
}

export function hora(valor) {
  return valor ? formatoHora.format(new Date(valor)) : '';
}

export function fechaHora(valor) {
  return valor ? `${fecha(valor)}, ${hora(valor)}` : '';
}

export function diaCorto(valor) {
  return formatoDia.format(comoFecha(valor)).replace('.', '');
}

export function cantidad(valor, unidad) {
  const numero = Number(valor) || 0;
  if (unidad === 'g' && Math.abs(numero) >= 1000)
    return `${(numero / 1000).toLocaleString('es-SV', { maximumFractionDigits: 2 })} kg`;
  if (unidad === 'ml' && Math.abs(numero) >= 1000)
    return `${(numero / 1000).toLocaleString('es-SV', { maximumFractionDigits: 2 })} L`;
  if (unidad === 'unidad')
    return `${numero.toLocaleString('es-SV', { maximumFractionDigits: 0 })} u`;
  return `${numero.toLocaleString('es-SV', { maximumFractionDigits: 2 })} ${unidad}`;
}

export function hoyIso() {
  return haceDias(0);
}

export function haceDias(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

export function redondear(valor) {
  return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
}
