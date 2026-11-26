import { useState } from 'react';
import api from '../api/cliente.js';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import { Aviso, Boton, Campo, Cargando, Dato, Encabezado, Etiqueta, Panel, Selector, Vacio, Ventana } from '../componentes/ui.jsx';
import { dinero, MESES } from '../utilidades/formato.js';

function nombrePeriodo(planilla) {
  return `${planilla.quincena === 1 ? 'Primera' : 'Segunda'} quincena de ${MESES[planilla.mes - 1]} ${planilla.anio}`;
}

function Boleta({ planilla, detalle, alCerrar }) {
  const { empleado } = detalle;
  return (
    <Ventana titulo="Boleta de pago" alCerrar={alCerrar} ancho="max-w-md">
      <article className="imprimible text-sm">
        <p className="font-titulo text-xl font-bold">Orígenes</p>
        <p className="text-piedra-600">{nombrePeriodo(planilla)}, sucursal {planilla.sucursal.nombre}</p>
        <div className="linea-punteada mt-3 pt-3">
          <p className="font-semibold">{empleado.nombres} {empleado.apellidos}</p>
          <p className="text-piedra-600">DUI {empleado.dui}. AFP {empleado.afp}.</p>
        </div>
        <div className="linea-punteada mt-3 pt-3">
          <Dato nombre="Salario de la quincena" valor={dinero(detalle.salario)} />
          <Dato nombre="Horas extra" valor={dinero(detalle.horas_extra)} />
          <Dato nombre="Bonificaciones" valor={dinero(detalle.bonificacion)} />
          <Dato nombre="Total devengado" valor={dinero(detalle.devengado)} fuerte />
        </div>
        <div className="linea-punteada mt-3 pt-3">
          <Dato nombre="ISSS 3 %" valor={`−${dinero(detalle.isss)}`} />
          <Dato nombre="AFP 7.25 %" valor={`−${dinero(detalle.afp)}`} />
          <Dato nombre="Impuesto sobre la renta" valor={`−${dinero(detalle.renta)}`} />
          <Dato nombre="Otros descuentos" valor={`−${dinero(detalle.otros_descuentos)}`} />
        </div>
        <div className="linea-punteada mt-3 pt-3">
          <Dato nombre="Líquido a recibir" valor={dinero(detalle.liquido)} fuerte />
        </div>
      </article>
      <div className="no-imprimir mt-4 flex justify-end"><Boton variante="secundario" onClick={() => window.print()}>Imprimir boleta</Boton></div>
    </Ventana>
  );
}

function AjusteDetalle({ planilla, detalle, alCerrar, alGuardar }) {
  const { enviando, error, enviar } = useEnvio();
  const [valores, setValores] = useState({ horas_extra: detalle.horas_extra, bonificacion: detalle.bonificacion, otros_descuentos: detalle.otros_descuentos });

  async function guardar(evento) {
    evento.preventDefault();
    const respuesta = await enviar(() => api.actualizar(`/planillas/${planilla.id}/detalles/${detalle.id}`, {
      horas_extra: Number(valores.horas_extra), bonificacion: Number(valores.bonificacion), otros_descuentos: Number(valores.otros_descuentos)
    }));
    if (respuesta) alGuardar(respuesta);
  }
  const campo = (nombre) => ({ type: 'number', min: '0', step: '0.01', value: valores[nombre], onChange: (e) => setValores({ ...valores, [nombre]: e.target.value }) });

  return (
    <Ventana titulo={`${detalle.empleado.nombres} ${detalle.empleado.apellidos}`} alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-sm text-piedra-600">Las horas extra y bonificaciones suman a la base de ISSS, AFP y renta. Al guardar se recalcula la boleta.</p>
        <Aviso error={error} />
        <Campo etiqueta="Horas extra en dólares" {...campo('horas_extra')} />
        <Campo etiqueta="Bonificaciones" {...campo('bonificacion')} />
        <Campo etiqueta="Otros descuentos" ayuda="Anticipos, préstamos u órdenes de descuento." {...campo('otros_descuentos')} />
        <Boton type="submit" disabled={enviando}>Recalcular boleta</Boton>
      </form>
    </Ventana>
  );
}

function DetallePlanilla({ id, alCambiar }) {
  const { datos, cargando, error, recargar } = useConsulta(`/planillas/${id}`);
  const accion = useEnvio();
  const [boleta, setBoleta] = useState(null);
  const [ajuste, setAjuste] = useState(null);

  if (cargando && !datos) return <Cargando />;
  if (error) return <Aviso error={error} />;
  const planilla = datos;
  const abierta = planilla.estado === 'borrador';

  async function cerrar() {
    const respuesta = await accion.enviar(() => api.crear(`/planillas/${id}/cierre`, {}));
    if (respuesta) {
      recargar();
      alCambiar();
    }
  }

  async function eliminar() {
    const respuesta = await accion.enviar(() => api.eliminar(`/planillas/${id}`).then(() => true));
    if (respuesta) alCambiar(true);
  }

  return (
    <Panel
      titulo={nombrePeriodo(planilla)}
      accion={<Etiqueta tono={abierta ? 'alerta' : 'bien'}>{abierta ? 'Borrador' : 'Cerrada'}</Etiqueta>}
    >
      <Aviso error={accion.error} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-piedra-200 text-right text-piedra-600">
              <th className="py-2 text-left font-semibold">Empleado</th>
              <th className="py-2 font-semibold">Devengado</th>
              <th className="py-2 font-semibold">ISSS</th>
              <th className="py-2 font-semibold">AFP</th>
              <th className="py-2 font-semibold">Renta</th>
              <th className="py-2 font-semibold">Otros</th>
              <th className="py-2 font-semibold">Líquido</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {planilla.detalles.map((detalle) => (
              <tr key={detalle.id} className="border-b border-piedra-100 text-right">
                <td className="py-2 text-left font-semibold">{detalle.empleado.apellidos}, {detalle.empleado.nombres}</td>
                <td className="py-2">{dinero(detalle.devengado)}</td>
                <td className="py-2">{dinero(detalle.isss)}</td>
                <td className="py-2">{dinero(detalle.afp)}</td>
                <td className="py-2">{dinero(detalle.renta)}</td>
                <td className="py-2">{dinero(detalle.otros_descuentos)}</td>
                <td className="py-2 font-semibold">{dinero(detalle.liquido)}</td>
                <td className="py-2 pl-3 text-right">
                  {abierta && <button type="button" className="mr-3 font-semibold text-anil-600" onClick={() => setAjuste(detalle)}>Ajustar</button>}
                  <button type="button" className="font-semibold text-anil-600" onClick={() => setBoleta(detalle)}>Boleta</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-x-10 sm:grid-cols-2">
        <div>
          <Dato nombre="Total devengado" valor={dinero(planilla.total_devengado)} />
          <Dato nombre="Descuentos a empleados" valor={dinero(planilla.total_descuentos)} />
          <Dato nombre="Líquido a pagar" valor={dinero(planilla.total_liquido)} fuerte />
        </div>
        <div>
          <Dato nombre="Aporte patronal (ISSS 7.5 % y AFP 8.75 %)" valor={dinero(planilla.total_patronal)} />
          <Dato nombre="Costo total para la empresa" valor={dinero(planilla.total_devengado + planilla.total_patronal)} fuerte />
        </div>
      </div>

      {abierta && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Boton variante="peligro" disabled={accion.enviando} onClick={eliminar}>Eliminar borrador</Boton>
          <Boton disabled={accion.enviando} onClick={cerrar}>Cerrar planilla</Boton>
        </div>
      )}

      {boleta && <Boleta planilla={planilla} detalle={boleta} alCerrar={() => setBoleta(null)} />}
      {ajuste && <AjusteDetalle planilla={planilla} detalle={ajuste} alCerrar={() => setAjuste(null)} alGuardar={() => { setAjuste(null); recargar(); alCambiar(); }} />}
    </Panel>
  );
}

export default function Planilla() {
  const lista = useConsulta('/planillas');
  const reglas = useConsulta('/planillas/reglas');
  const generacion = useEnvio();
  const ahora = new Date();
  const [periodo, setPeriodo] = useState({ anio: ahora.getFullYear(), mes: ahora.getMonth() + 1, quincena: ahora.getDate() <= 15 ? 1 : 2 });
  const [elegida, setElegida] = useState(null);

  async function generar(evento) {
    evento.preventDefault();
    const planilla = await generacion.enviar(() => api.crear('/planillas', periodo));
    if (planilla) {
      setElegida(planilla.id);
      lista.recargar();
    }
  }

  const planillas = lista.datos || [];

  return (
    <div>
      <Encabezado titulo="Planilla quincenal" detalle="Cada quincena descuenta ISSS, AFP e impuesto sobre la renta según la tabla vigente." />
      <div className="grid gap-6 xl:grid-cols-[19rem_1fr]">
        <div className="space-y-5">
          <Panel titulo="Generar planilla">
            <form onSubmit={generar} className="space-y-3">
              <Aviso error={generacion.error} />
              <div className="grid grid-cols-2 gap-3">
                <Selector etiqueta="Mes" value={periodo.mes} onChange={(e) => setPeriodo({ ...periodo, mes: Number(e.target.value) })} opciones={MESES.map((mes, indice) => ({ valor: indice + 1, texto: mes }))} />
                <Campo etiqueta="Año" type="number" min="2020" max="2100" value={periodo.anio} onChange={(e) => setPeriodo({ ...periodo, anio: Number(e.target.value) })} />
              </div>
              <Selector etiqueta="Quincena" value={periodo.quincena} onChange={(e) => setPeriodo({ ...periodo, quincena: Number(e.target.value) })} opciones={[{ valor: 1, texto: 'Primera, del 1 al 15' }, { valor: 2, texto: 'Segunda, del 16 a fin de mes' }]} />
              <Boton type="submit" className="w-full" disabled={generacion.enviando}>Generar planilla</Boton>
            </form>
          </Panel>

          <Panel titulo="Planillas de la sucursal">
            {lista.cargando && <Cargando />}
            <Aviso error={lista.error} />
            {!lista.cargando && planillas.length === 0 && <p className="text-sm text-piedra-600">Aún no se ha generado ninguna.</p>}
            <ul>
              {planillas.map((planilla) => (
                <li key={planilla.id}>
                  <button type="button" onClick={() => setElegida(planilla.id)} className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm ${elegida === planilla.id ? 'bg-anil-50' : 'hover:bg-anil-50'}`}>
                    <span>
                      <span className="block font-semibold">{nombrePeriodo(planilla)}</span>
                      <span className="text-piedra-600">Líquido {dinero(planilla.total_liquido)}</span>
                    </span>
                    <Etiqueta tono={planilla.estado === 'borrador' ? 'alerta' : 'bien'}>{planilla.estado === 'borrador' ? 'Borrador' : 'Cerrada'}</Etiqueta>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          {reglas.datos && (
            <Panel titulo="Retención de renta quincenal">
              <table className="w-full text-xs">
                <tbody>
                  {reglas.datos.tramos.map((tramo) => (
                    <tr key={tramo.tramo} className="border-b border-piedra-100 last:border-0">
                      <td className="py-1.5">{dinero(tramo.desde)} {tramo.hasta ? `a ${dinero(tramo.hasta)}` : 'en adelante'}</td>
                      <td className="py-1.5 text-right">{tramo.porcentaje === 0 ? 'Sin retención' : `${tramo.porcentaje * 100} % sobre ${dinero(tramo.sobre_exceso)} más ${dinero(tramo.cuota_fija)}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-xs text-piedra-600">Base: devengado menos ISSS y AFP. El ISSS cotiza hasta {dinero(reglas.datos.isssTopeMensual)} mensuales.</p>
            </Panel>
          )}
        </div>

        <div>
          {elegida
            ? <DetallePlanilla key={elegida} id={elegida} alCambiar={(eliminada) => { if (eliminada) setElegida(null); lista.recargar(); }} />
            : <Vacio titulo="Elige o genera una planilla">Verás el cálculo de cada empleado, podrás ajustar horas extra y descuentos, y luego cerrarla para emitir las boletas.</Vacio>}
        </div>
      </div>
    </div>
  );
}
