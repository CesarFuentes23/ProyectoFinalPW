import { PLANILLA } from '../../config/reglas.js';
import { redondear } from '../../utilidades/dinero.js';

export function calcularRenta(baseGravada, tramos) {
  const tramo = tramos.find((t) => baseGravada >= t.desde && (t.hasta === null || baseGravada <= t.hasta));
  if (!tramo) return 0;
  return redondear((baseGravada - tramo.sobre_exceso) * tramo.porcentaje + tramo.cuota_fija);
}

export function calcularBoleta(datos, tramosQuincenales) {
  const salario = redondear(datos.salarioMensual / 2);
  const horasExtra = redondear(datos.horasExtra || 0);
  const bonificacion = redondear(datos.bonificacion || 0);
  const otrosDescuentos = redondear(datos.otrosDescuentos || 0);

  const devengado = redondear(salario + horasExtra + bonificacion);
  const baseIsss = Math.min(devengado, PLANILLA.isssTopeMensual / 2);

  const isss = redondear(baseIsss * PLANILLA.isssEmpleado);
  const afp = redondear(devengado * PLANILLA.afpEmpleado);
  const renta = calcularRenta(redondear(devengado - isss - afp), tramosQuincenales);
  const liquido = redondear(devengado - isss - afp - renta - otrosDescuentos);

  return {
    salario,
    horas_extra: horasExtra,
    bonificacion,
    devengado,
    isss,
    afp,
    renta,
    otros_descuentos: otrosDescuentos,
    liquido,
    isss_patronal: redondear(baseIsss * PLANILLA.isssPatrono),
    afp_patronal: redondear(devengado * PLANILLA.afpPatrono)
  };
}

export function totalizar(detalles) {
  const sumar = (campo) => redondear(detalles.reduce((suma, detalle) => suma + detalle[campo], 0));
  return {
    total_devengado: sumar('devengado'),
    total_descuentos: redondear(sumar('isss') + sumar('afp') + sumar('renta') + sumar('otros_descuentos')),
    total_liquido: sumar('liquido'),
    total_patronal: redondear(sumar('isss_patronal') + sumar('afp_patronal'))
  };
}
