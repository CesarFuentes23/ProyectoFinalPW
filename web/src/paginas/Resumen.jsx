import { Link } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion.jsx';
import useConsulta from '../ganchos/useConsulta.js';
import { Aviso, Cargando, Dato, Panel } from '../componentes/ui.jsx';
import { cantidad, diaCorto, dinero, NOMBRE_METODO } from '../utilidades/formato.js';

const BARRA = 'w-full rounded-t-md border-2 border-b-0 border-tinta';

function enBodega(alerta) {
  const hay = cantidad(alerta.cantidad, alerta.unidad);
  return `${hay} de ${cantidad(alerta.minimo, alerta.unidad)}`;
}

function SemanaEnBarras({ semana }) {
  const mayor = Math.max(...semana.map((dia) => dia.total), 1);
  return (
    <ol className="flex h-44 items-end gap-2" aria-label="Ventas de los últimos siete días">
      {semana.map((dia, indice) => {
        const esHoy = indice === semana.length - 1;
        return (
          <li key={dia.dia} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold">{dinero(dia.total)}</span>
            <div
              className={`${BARRA} ${esHoy ? 'bg-maiz' : 'bg-cafe-600'}`}
              style={{ height: `${Math.max((dia.total / mayor) * 100, 2)}%` }}
            />
            <span className={`text-xs ${esHoy ? 'font-bold' : 'text-piedra-600'}`}>
              {esHoy ? 'hoy' : diaCorto(dia.dia)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function plural(numero, uno, varios) {
  return `${numero} ${numero === 1 ? uno : varios}`;
}

function Cifra({ nombre, valor, fondo }) {
  return (
    <div className={`rounded-xl border-2 border-tinta p-4 shadow-sello ${fondo}`}>
      <p className="text-sm font-bold text-piedra-600">{nombre}</p>
      <p className="font-titulo text-3xl font-bold">{valor}</p>
    </div>
  );
}
export default function Resumen() {
  const { sucursal } = useSesion();
  const { datos, cargando, error } = useConsulta('/tablero');

  if (cargando && !datos) return <Cargando />;
  if (error) return <Aviso error={error} />;

  const { hoy, semana, mas_vendidos: masVendidos, alertas, por_pagar: porPagar } = datos;
  const agotados = alertas.filter((alerta) => alerta.agotado).length;
  const enMinimo = `${plural(alertas.length, 'artículo', 'artículos')} en el mínimo`;
  const sinNada = agotados > 0 ? `, ${plural(agotados, 'agotado', 'agotados')}` : '';

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl text-cafe-900">Resumen del día</h1>
        <div className="franja mt-1 w-[128px]" aria-hidden="true" />
        <p className="mt-2 text-sm text-piedra-600">Sucursal {sucursal?.nombre}</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Cifra nombre="Ventas de hoy" valor={hoy.ventas} fondo="bg-maiz-100" />
        <Cifra nombre="Total cobrado" valor={dinero(hoy.total)} fondo="bg-hoja-100" />
        <Cifra nombre="Ticket promedio" valor={dinero(hoy.ticket_promedio)} fondo="bg-laguna-100" />
        <Cifra nombre="Utilidad bruta" valor={dinero(hoy.utilidad_bruta)} fondo="bg-cereza-100" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel titulo="Últimos siete días" className="lg:col-span-2">
          <SemanaEnBarras semana={semana} />
        </Panel>

        <Panel titulo="Cobrado hoy">
          {Object.entries(hoy.cobrado).map(([metodo, monto]) => (
            <Dato key={metodo} nombre={NOMBRE_METODO[metodo]} valor={dinero(monto)} />
          ))}
          <div className="linea-punteada mt-2 pt-2">
            <Dato nombre="IVA por declarar de hoy" valor={dinero(hoy.iva)} />
            <Dato nombre="Costo de lo vendido" valor={dinero(hoy.costo)} />
          </div>
        </Panel>

        <Panel titulo="Lo más pedido de la semana">
          {masVendidos.length === 0 && (
            <p className="text-sm text-piedra-600">Aún no hay ventas esta semana.</p>
          )}
          <ol className="space-y-2 text-sm">
            {masVendidos.map((producto, indice) => (
              <li key={producto.nombre} className="flex items-baseline gap-3">
                <span className="font-titulo text-xl font-bold text-cereza">{indice + 1}</span>
                <span className="flex-1 font-semibold">{producto.nombre}</span>
                <span className="text-piedra-600">{producto.unidades} u</span>
                <span className="w-16 text-right">{dinero(producto.monto)}</span>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          titulo="Bodega"
          accion={
            <Link to="/inventario" className="text-sm font-bold text-cafe-600 hover:underline">
              Ver existencias
            </Link>
          }
        >
          {alertas.length === 0 ? (
            <p className="text-sm text-hoja">Todos los artículos están sobre su mínimo.</p>
          ) : (
            <>
              <p className="mb-2 text-sm font-semibold text-maiz-700">
                {enMinimo}
                {sinNada}.
              </p>
              <ul className="space-y-1 text-sm">
                {alertas.slice(0, 6).map((alerta) => (
                  <li
                    key={`${alerta.sucursal_id}-${alerta.articulo_id}`}
                    className="flex justify-between gap-3"
                  >
                    <span>{alerta.nombre}</span>
                    <span className={alerta.agotado ? 'font-bold text-cereza' : 'text-piedra-600'}>
                      {alerta.agotado ? 'Agotado' : enBodega(alerta)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>

        <Panel
          titulo="Proveedores"
          accion={
            <Link to="/compras" className="text-sm font-bold text-cafe-600 hover:underline">
              Ver cuentas
            </Link>
          }
        >
          <p className="font-titulo text-4xl font-bold">{dinero(porPagar)}</p>
          <p className="mt-1 text-sm text-piedra-600">pendientes de pago en facturas al crédito.</p>
        </Panel>
      </div>
    </div>
  );
}
