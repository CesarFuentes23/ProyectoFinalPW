import { Router } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { Venta, VentaLinea, VentaPago, Compra } from '../../modelos/index.js';
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

async function resumen(req, res, next) {
  try {
    const todas = req.usuario.rol === 'administrador' && !req.query.sucursal_id;
    const sucursalId = todas ? null : sucursalDe(req);
    const condicion = { estado: 'emitida' };
    if (sucursalId) condicion.sucursal_id = sucursalId;
    const deHoy = { ...condicion, fecha: { [Op.between]: [inicioDelDia(), finDelDia()] } };

    const [ventasHoy, pagosHoy, masVendidos, semana, alertas, porPagar] = await Promise.all([
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
      })
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
      por_pagar: redondear(porPagar || 0)
    });
  } catch (error) {
    next(error);
  }
}

rutas.get('/tablero', permitir('administrador', 'gerente'), resumen);

export default rutas;
