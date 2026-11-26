import { performance } from 'node:perf_hooks';
import { bd, Usuario, Venta, Existencia, Articulo, Producto, Correlativo, TurnoCaja } from '../src/modelos/index.js';
import { abrirTurno } from '../src/modulos/caja/servicio.js';
import { registrarVenta } from '../src/modulos/ventas/servicio.js';

const SIMULTANEAS = Number(process.argv[2]) || 40;

async function medir() {
  const cajera = await Usuario.findOne({ where: { correo: 'caja.tecla@origenes.sv' } });
  const sucursalId = cajera.sucursal_id;
  const latte = await Producto.findOne({ where: { nombre: 'Latte grande' } });
  const leche = await Articulo.findOne({ where: { nombre: 'Leche entera' } });

  const abierto = await TurnoCaja.findOne({ where: { usuario_id: cajera.id, sucursal_id: sucursalId, estado: 'abierto' } });
  if (!abierto) await abrirTurno({ usuario: cajera, sucursalId, fondoInicial: 50 });

  const lecheAntes = (await Existencia.findOne({ where: { articulo_id: leche.id, sucursal_id: sucursalId } })).cantidad;
  const correlativoAntes = (await Correlativo.findOne({ where: { sucursal_id: sucursalId, tipo_documento: 'FCF' } })).siguiente;

  const duraciones = [];
  const inicio = performance.now();
  const resultados = await Promise.allSettled(
    Array.from({ length: SIMULTANEAS }, async () => {
      const t0 = performance.now();
      const venta = await registrarVenta({
        usuario: cajera,
        sucursalId,
        tipoDocumento: 'FCF',
        lineas: [{ producto_id: latte.id, cantidad: 1 }],
        pagos: [{ metodo: 'tarjeta', monto: latte.precio }]
      });
      duraciones.push(performance.now() - t0);
      return venta.correlativo;
    })
  );
  const total = performance.now() - inicio;

  const exitosas = resultados.filter((r) => r.status === 'fulfilled').map((r) => r.value).sort((a, b) => a - b);
  const fallidas = resultados.filter((r) => r.status === 'rejected');
  const lecheDespues = (await Existencia.findOne({ where: { articulo_id: leche.id, sucursal_id: sucursalId } })).cantidad;
  const repetidos = exitosas.length - new Set(exitosas).size;
  const consecutivos = exitosas.every((numero, i) => numero === correlativoAntes + i);
  duraciones.sort((a, b) => a - b);

  console.log(JSON.stringify({
    ventas_simultaneas: SIMULTANEAS,
    exitosas: exitosas.length,
    fallidas: fallidas.length,
    motivo_fallas: [...new Set(fallidas.map((f) => f.reason.message))],
    correlativos_repetidos: repetidos,
    correlativos_consecutivos: consecutivos,
    leche_descontada_ml: lecheAntes - lecheDespues,
    leche_esperada_ml: exitosas.length * 250,
    tiempo_total_ms: Math.round(total),
    mediana_ms: Math.round(duraciones[Math.floor(duraciones.length / 2)] || 0),
    maximo_ms: Math.round(duraciones[duraciones.length - 1] || 0)
  }, null, 2));
  await bd.close();
}

medir().catch((error) => {
  console.error(error);
  process.exit(1);
});
