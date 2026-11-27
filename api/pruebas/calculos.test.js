import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularBoleta, calcularRenta } from '../src/modulos/personal/calculos.js';
import { agregarIva, desglosarIva } from '../src/utilidades/dinero.js';
import { tramosRenta } from '../src/semilla/datos.js';

const quincenal = tramosRenta.filter((tramo) => tramo.periodo === 'quincenal');

test('un precio con IVA incluido se desglosa en subtotal e impuesto', () => {
  assert.deepEqual(desglosarIva(11.3), { subtotal: 10, iva: 1.3, total: 11.3 });
  assert.deepEqual(desglosarIva(3.75), { subtotal: 3.32, iva: 0.43, total: 3.75 });
});

test('a un valor neto se le suma el 13 % de IVA', () => {
  assert.deepEqual(agregarIva(100), { subtotal: 100, iva: 13, total: 113 });
});

test('la renta quincenal respeta los cuatro tramos', () => {
  assert.equal(calcularRenta(250, quincenal), 0);
  assert.equal(calcularRenta(275, quincenal), 0);
  assert.equal(calcularRenta(400, quincenal), 21.33);
  assert.equal(calcularRenta(800, quincenal), 100.48);
  assert.equal(calcularRenta(1500, quincenal), 288.57);
});

test('salario de $600 mensuales: sin renta porque la base queda bajo $275', () => {
  const boleta = calcularBoleta({ salarioMensual: 600 }, quincenal);
  assert.equal(boleta.salario, 300);
  assert.equal(boleta.isss, 9);
  assert.equal(boleta.afp, 21.75);
  assert.equal(boleta.renta, 0);
  assert.equal(boleta.liquido, 269.25);
});

test('salario de $1,150 mensuales: ISSS con tope y renta del tramo III', () => {
  const boleta = calcularBoleta({ salarioMensual: 1150 }, quincenal);
  assert.equal(boleta.isss, 15);
  assert.equal(boleta.afp, 41.69);
  assert.equal(boleta.renta, 44.14);
  assert.equal(boleta.liquido, 474.17);
});

test('salario de $2,400 mensuales: renta del tramo IV', () => {
  const boleta = calcularBoleta({ salarioMensual: 2400 }, quincenal);
  assert.equal(boleta.salario, 1200);
  assert.equal(boleta.isss, 15);
  assert.equal(boleta.afp, 87);
  assert.equal(boleta.renta, 167.97);
  assert.equal(boleta.liquido, 930.03);
});

test('las horas extra y bonificaciones aumentan la base de los descuentos', () => {
  const boleta = calcularBoleta(
    { salarioMensual: 600, horasExtra: 40, bonificacion: 10, otrosDescuentos: 25 },
    quincenal
  );
  assert.equal(boleta.devengado, 350);
  assert.equal(boleta.isss, 10.5);
  assert.equal(boleta.afp, 25.38);
  assert.equal(boleta.renta, 12.74);
  assert.equal(boleta.liquido, 276.38);
});
