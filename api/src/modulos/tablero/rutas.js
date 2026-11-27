import { Router } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import {
  Venta,
  VentaLinea,
  VentaPago,
  Compra,
  CompraLinea,
  Planilla
} from '../../modelos/index.js';
import { permitir, sucursalDe } from '../../intermedios/autenticar.js';
import { redondear } from '../../utilidades/dinero.js';
import { fechaLocal, finDelDia, hoy, inicioDelDia, sumarDias } from '../../utilidades/fechas.js';
import { listarAlertas } from '../inventario/servicio.js';

const rutas = Router();

async function ventasPorDia(condicion, desde) {
  const ventas = await Venta.findAll({
    attributes: ['fecha', 'total'],
    where: { ...condicion, fecha: { [Op.gte]: inicioDelDia(desde) } },
    raw: true
  });

  const serie = [];
  for (let i = 0; i < 7; i += 1) {
    const dia = sumarDias(desde, i);
    const delDia = ventas.filter((venta) => fechaLocal(venta.fecha) === dia);
    serie.push({
      dia,
      total: redondear(delDia.reduce((suma, venta) => suma + Number(venta.total), 0)),
      ventas: delDia.length
    });
  }
  return serie;
}

async function resultadoDelMes(sucursalId) {
  const primerDia = `${hoy().slice(0, 8)}01`;
  const [anio, mes] = primerDia.split('-').map(Number);
  const deLaSucursal = sucursalId ? { sucursal_id: sucursalId } : {};

  const [ventas, gastos, planillas] = await Promise.all([
    Venta.findAll({
      where: { ...deLaSucursal, estado: 'emitida', fecha: { [Op.gte]: inicioDelDia(primerDia) } },
      attributes: ['subtotal', 'costo']
    }),
    CompraLinea.findAll({
      attributes: [[fn('sum', col('compra_linea.total')), 'monto']],
      where: { clase: 'gasto' },
      include: [
        {
          model: Compra,
          attributes: [],
          where: { ...deLaSucursal, fecha: { [Op.between]: [primerDia, hoy()] } },
          required: true
        }
      ],
      raw: true
    }),
    Planilla.findAll({
      where: { ...deLaSucursal, anio, mes },
      attributes: ['total_devengado', 'total_patronal']
    })
  ]);

  const ventasSinIva = redondear(ventas.reduce((suma, venta) => suma + venta.subtotal, 0));
  const costo = redondear(ventas.reduce((suma, venta) => suma + venta.costo, 0));
  const planilla = redondear(
    planillas.reduce((suma, fila) => suma + fila.total_devengado + fila.total_patronal, 0)
  );
  const gastosDelMes = redondear(Number(gastos[0]?.monto) || 0);

  return {
    desde: primerDia,
    hasta: hoy(),
    ventas_sin_iva: ventasSinIva,
    costo_de_lo_vendido: costo,
    utilidad_bruta: redondear(ventasSinIva - costo),
    gastos: gastosDelMes,
    planilla,
    quincenas_de_planilla: planillas.length,
    utilidad_neta: redondear(ventasSinIva - costo - gastosDelMes - planilla)
  };
}

async function resumen(req, res, next) {
  try {
    const todas = req.usuario.rol === 'administrador' && !req.query.sucursal_id;
    const sucursalId = todas ? null : sucursalDe(req);
    const condicion = { estado: 'emitida' };
    if (sucursalId) condicion.sucursal_id = sucursalId;
    const deHoy = { ...condicion, fecha: { [Op.between]: [inicioDelDia(), finDelDia()] } };

    const [ventasHoy, pagosHoy, masVendidos, semana, alertas, porPagar, mes] = await Promise.all([
      Venta.findAll({ where: deHoy, attributes: ['total', 'costo', 'iva'] }),
      VentaPago.findAll({
        attributes: ['metodo', [fn('sum', col('monto')), 'monto']],
        include: [{ model: Venta, attributes: [], where: deHoy, required: true }],
        group: ['metodo'],
        raw: true
      }),
      VentaLinea.findAll({
        attributes: [
          'descripcion',
          [fn('sum', col('cantidad')), 'unidades'],
          [fn('sum', col('venta_linea.total')), 'monto']
        ],
        include: [
          {
            model: Venta,
            attributes: [],
            where: { ...condicion, fecha: { [Op.gte]: inicioDelDia(sumarDias(hoy(), -6)) } },
            required: true
          }
        ],
        group: ['descripcion'],
        order: [[literal('unidades'), 'DESC']],
        limit: 5,
        raw: true
      }),
      ventasPorDia(condicion, sumarDias(hoy(), -6)),
      listarAlertas(sucursalId),
      Compra.sum('saldo', {
        where: sucursalId
          ? { estado: 'pendiente', sucursal_id: sucursalId }
          : { estado: 'pendiente' }
      }),
      resultadoDelMes(sucursalId)
    ]);

    const total = redondear(ventasHoy.reduce((suma, venta) => suma + venta.total, 0));
    const costo = redondear(ventasHoy.reduce((suma, venta) => suma + venta.costo, 0));
    const iva = redondear(ventasHoy.reduce((suma, venta) => suma + venta.iva, 0));
    const cobrado = { efectivo: 0, tarjeta: 0, bitcoin: 0 };
    pagosHoy.forEach((fila) => {
      cobrado[fila.metodo] = redondear(fila.monto);
    });

    res.json({
      hoy: {
        ventas: ventasHoy.length,
        total,
        iva,
        costo,
        utilidad_bruta: redondear(total - iva - costo),
        ticket_promedio: ventasHoy.length > 0 ? redondear(total / ventasHoy.length) : 0,
        cobrado
      },
      semana,
      mas_vendidos: masVendidos.map((fila) => ({
        nombre: fila.descripcion,
        unidades: Number(fila.unidades),
        monto: redondear(fila.monto)
      })),
      alertas,
      por_pagar: redondear(porPagar || 0),
      mes
    });
  } catch (error) {
    next(error);
  }
}

rutas.get('/tablero', permitir('administrador', 'gerente'), resumen);

export default rutas;
