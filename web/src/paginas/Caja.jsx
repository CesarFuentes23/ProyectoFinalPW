import { useState } from 'react';
import api from '../api/cliente.js';
import { useSesion } from '../contexto/Sesion.jsx';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Dato,
  Encabezado,
  Etiqueta,
  Panel,
  Selector,
  Tabla,
  Vacio,
  Ventana
} from '../componentes/ui.jsx';
import { dinero, fechaHora, NOMBRE_METODO, redondear } from '../utilidades/formato.js';

const METODOS = ['efectivo', 'tarjeta', 'bitcoin'];

function Diferencia({ valor }) {
  if (valor === 0) return <Etiqueta tono="bien">Cuadra</Etiqueta>;
  return (
    <Etiqueta tono="mal">
      {valor > 0 ? 'Sobran' : 'Faltan'} {dinero(Math.abs(valor))}
    </Etiqueta>
  );
}

function Apertura({ alAbrir }) {
  const { enviando, error, enviar } = useEnvio();
  const [fondo, setFondo] = useState('50');

  async function abrir(evento) {
    evento.preventDefault();
    const turno = await enviar(() => api.crear('/turnos', { fondo_inicial: Number(fondo) }));
    if (turno) alAbrir();
  }

  return (
    <Panel titulo="No tienes una caja abierta" className="max-w-md">
      <form onSubmit={abrir} className="space-y-3">
        <p className="text-sm text-piedra-600">
          Cuenta el efectivo inicial y abre el turno para empezar a cobrar.
        </p>
        <Aviso error={error} />
        <Campo
          etiqueta="Fondo inicial en efectivo"
          type="number"
          min="0"
          step="0.01"
          required
          value={fondo}
          onChange={(e) => setFondo(e.target.value)}
        />
        <Boton type="submit" disabled={enviando}>
          Abrir caja
        </Boton>
      </form>
    </Panel>
  );
}

function TurnoAbierto({ turno, alCambiar }) {
  const movimiento = useEnvio();
  const cierre = useEnvio();
  const [nuevo, setNuevo] = useState({ tipo: 'retiro', monto: '', motivo: '' });
  const [contado, setContado] = useState({ efectivo: '', tarjeta: '', bitcoin: '' });
  const [observacion, setObservacion] = useState('');
  const [cerrado, setCerrado] = useState(null);
  const { resumen } = turno;

  async function registrar(evento) {
    evento.preventDefault();
    const respuesta = await movimiento.enviar(() =>
      api.crear(`/turnos/${turno.id}/movimientos`, { ...nuevo, monto: Number(nuevo.monto) })
    );
    if (respuesta) {
      setNuevo({ tipo: 'retiro', monto: '', motivo: '' });
      alCambiar();
    }
  }

  async function cerrar(evento) {
    evento.preventDefault();
    const respuesta = await cierre.enviar(() =>
      api.crear(`/turnos/${turno.id}/cierre`, {
        contado_efectivo: Number(contado.efectivo),
        contado_tarjeta: Number(contado.tarjeta),
        contado_bitcoin: Number(contado.bitcoin),
        observacion
      })
    );
    if (respuesta) setCerrado(respuesta);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel titulo="Lo que el sistema espera">
        <Dato nombre="Abierta" valor={fechaHora(turno.abierto_en)} />
        <Dato nombre="Fondo inicial" valor={dinero(turno.fondo_inicial)} />
        <Dato
          nombre={`Ventas cobradas (${resumen.ventas})`}
          valor={dinero(resumen.total_vendido)}
        />
        <Dato nombre="Ingresos de efectivo" valor={dinero(resumen.ingresos)} />
        <Dato nombre="Retiros de efectivo" valor={dinero(resumen.retiros)} />
        <div className="linea-punteada mt-2 pt-2">
          {METODOS.map((metodo) => (
            <Dato
              key={metodo}
              nombre={`${NOMBRE_METODO[metodo]} esperado`}
              valor={dinero(resumen.esperado[metodo])}
              fuerte
            />
          ))}
        </div>
        {resumen.anuladas > 0 && (
          <p className="mt-2 text-sm text-piedra-600">
            Hay {resumen.anuladas} documentos anulados que no cuentan en el cuadre.
          </p>
        )}
      </Panel>

      <div className="space-y-5">
        <Panel titulo="Entrada o salida de efectivo">
          <form onSubmit={registrar} className="space-y-3">
            <Aviso error={movimiento.error} />
            <div className="grid grid-cols-2 gap-3">
              <Selector
                etiqueta="Tipo"
                value={nuevo.tipo}
                onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                opciones={[
                  { valor: 'retiro', texto: 'Retiro' },
                  { valor: 'ingreso', texto: 'Ingreso' }
                ]}
              />
              <Campo
                etiqueta="Monto"
                type="number"
                min="0.01"
                step="0.01"
                required
                value={nuevo.monto}
                onChange={(e) => setNuevo({ ...nuevo, monto: e.target.value })}
              />
            </div>
            <Campo
              etiqueta="Motivo"
              required
              placeholder="Compra de hielo, depósito al banco…"
              value={nuevo.motivo}
              onChange={(e) => setNuevo({ ...nuevo, motivo: e.target.value })}
            />
            <Boton type="submit" variante="secundario" disabled={movimiento.enviando}>
              Registrar movimiento
            </Boton>
          </form>
          {resumen.movimientos.length > 0 && (
            <ul className="linea-punteada mt-3 space-y-1 pt-3 text-sm">
              {resumen.movimientos.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>{item.motivo}</span>
                  <span className={item.tipo === 'retiro' ? 'text-cereza' : 'text-hoja'}>
                    {item.tipo === 'retiro' ? '−' : '+'}
                    {dinero(item.monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel titulo="Cerrar caja">
          <form onSubmit={cerrar} className="space-y-3">
            <p className="text-sm text-piedra-600">
              Escribe lo que contaste. El sistema lo compara con lo esperado.
            </p>
            <Aviso error={cierre.error} />
            {METODOS.map((metodo) => (
              <div key={metodo} className="flex items-end gap-3">
                <Campo
                  className="flex-1"
                  etiqueta={
                    metodo === 'efectivo'
                      ? 'Efectivo contado en gaveta'
                      : metodo === 'tarjeta'
                        ? 'Total del cierre de POS de tarjetas'
                        : 'Total recibido en Bitcoin o Chivo Wallet'
                  }
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={contado[metodo]}
                  onChange={(e) => setContado({ ...contado, [metodo]: e.target.value })}
                />
                <div className="w-32 pb-2 text-right">
                  {contado[metodo] !== '' && (
                    <Diferencia
                      valor={redondear(Number(contado[metodo]) - resumen.esperado[metodo])}
                    />
                  )}
                </div>
              </div>
            ))}
            <Campo
              etiqueta="Observación"
              placeholder="Explica cualquier sobrante o faltante"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
            <Boton type="submit" disabled={cierre.enviando}>
              Cerrar caja
            </Boton>
          </form>
        </Panel>
      </div>

      {cerrado && (
        <Ventana titulo="Caja cerrada" alCerrar={alCambiar}>
          <DetalleTurno turno={cerrado} />
        </Ventana>
      )}
    </div>
  );
}

function DetalleTurno({ turno }) {
  return (
    <div>
      <p className="mb-3 text-sm text-piedra-600">
        {`${turno.usuario?.nombre}, sucursal ${turno.sucursal?.nombre}. ` +
          `De ${fechaHora(turno.abierto_en)} a ${fechaHora(turno.cerrado_en)}.`}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-piedra-600">
            <th className="py-1 font-semibold">Método</th>
            <th className="py-1 text-right font-semibold">Esperado</th>
            <th className="py-1 text-right font-semibold">Contado</th>
            <th className="py-1 text-right font-semibold">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {METODOS.map((metodo) => (
            <tr key={metodo} className="border-t border-piedra-100">
              <td className="py-2">{NOMBRE_METODO[metodo]}</td>
              <td className="py-2 text-right">{dinero(turno[`esperado_${metodo}`])}</td>
              <td className="py-2 text-right">{dinero(turno[`contado_${metodo}`])}</td>
              <td className="py-2 text-right">
                <Diferencia valor={turno.diferencia[metodo]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {turno.observacion && <p className="mt-3 text-sm">Observación: {turno.observacion}</p>}
    </div>
  );
}

function Historial() {
  const { datos, cargando, error } = useConsulta('/turnos', { estado: 'cerrado' });
  const [elegido, setElegido] = useState(null);

  if (cargando) return <Cargando />;
  if (error) return <Aviso error={error} />;

  const columnas = [
    { titulo: 'Cierre', celda: (t) => fechaHora(t.cerrado_en) },
    { titulo: 'Responsable', celda: (t) => t.usuario.nombre },
    { titulo: 'Efectivo esperado', derecha: true, celda: (t) => dinero(t.esperado_efectivo) },
    { titulo: 'Efectivo contado', derecha: true, celda: (t) => dinero(t.contado_efectivo) },
    {
      titulo: 'Resultado',
      derecha: true,
      celda: (t) => (
        <Diferencia
          valor={redondear(t.diferencia.efectivo + t.diferencia.tarjeta + t.diferencia.bitcoin)}
        />
      )
    }
  ];

  return (
    <>
      <Tabla
        columnas={columnas}
        filas={datos}
        alElegir={setElegido}
        vacio="Todavía no hay turnos cerrados"
      />
      {elegido && (
        <Ventana titulo="Cuadre del turno" alCerrar={() => setElegido(null)}>
          <DetalleTurno turno={elegido} />
        </Ventana>
      )}
    </>
  );
}

export default function Caja() {
  const { esJefatura } = useSesion();
  const turno = useConsulta('/turnos/actual');

  return (
    <div>
      <Encabezado titulo="Caja" detalle="Apertura, movimientos de efectivo y cuadre del turno." />
      {turno.cargando ? <Cargando /> : null}
      <Aviso error={turno.error} />
      {!turno.cargando &&
        !turno.error &&
        (turno.datos ? (
          <TurnoAbierto turno={turno.datos} alCambiar={turno.recargar} />
        ) : (
          <Apertura alAbrir={turno.recargar} />
        ))}

      {esJefatura && (
        <section className="mt-10">
          <h2 className="mb-3 text-2xl text-cafe-900">Turnos cerrados</h2>
          <Historial />
        </section>
      )}
      {!esJefatura && !turno.datos && !turno.cargando && (
        <div className="mt-6 max-w-md">
          <Vacio titulo="Sin movimientos por ahora">
            Los cuadres anteriores los revisa la gerencia.
          </Vacio>
        </div>
      )}
    </div>
  );
}
