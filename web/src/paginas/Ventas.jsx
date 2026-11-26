import { useState } from 'react';
import api from '../api/cliente.js';
import { useSesion } from '../contexto/Sesion.jsx';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import Documento from '../componentes/Documento.jsx';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Encabezado,
  Etiqueta,
  Selector,
  Tabla,
  Ventana
} from '../componentes/ui.jsx';
import { dinero, fechaHora, haceDias, hoyIso, NOMBRE_METODO } from '../utilidades/formato.js';

function VerDocumento({ id, alCerrar, alAnular }) {
  const { esJefatura } = useSesion();
  const { datos: venta, cargando, error, recargar } = useConsulta(`/ventas/${id}`);
  const anulacion = useEnvio();
  const [motivo, setMotivo] = useState('');
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);

  async function anular(evento) {
    evento.preventDefault();
    const respuesta = await anulacion.enviar(() =>
      api.crear(`/ventas/${id}/anulacion`, { motivo })
    );
    if (respuesta) {
      setPidiendoMotivo(false);
      recargar();
      alAnular();
    }
  }

  return (
    <Ventana titulo="Documento" alCerrar={alCerrar} ancho="max-w-md">
      {cargando && <Cargando />}
      <Aviso error={error} />
      {venta && (
        <>
          <Documento venta={venta} />
          <div className="no-imprimir mt-4 space-y-3">
            <Aviso error={anulacion.error} />
            {pidiendoMotivo ? (
              <form onSubmit={anular} className="space-y-2">
                <Campo
                  etiqueta="Motivo de la anulación"
                  required
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  ayuda="Los insumos regresan a existencias y el correlativo queda anulado."
                />
                <div className="flex justify-end gap-2">
                  <Boton variante="secundario" onClick={() => setPidiendoMotivo(false)}>
                    Conservar documento
                  </Boton>
                  <Boton type="submit" variante="peligro" disabled={anulacion.enviando}>
                    Anular documento
                  </Boton>
                </div>
              </form>
            ) : (
              <div className="flex justify-end gap-2">
                {esJefatura && venta.estado === 'emitida' && (
                  <Boton variante="peligro" onClick={() => setPidiendoMotivo(true)}>
                    Anular
                  </Boton>
                )}
                <Boton variante="secundario" onClick={() => window.print()}>
                  Imprimir
                </Boton>
              </div>
            )}
          </div>
        </>
      )}
    </Ventana>
  );
}

export default function Ventas() {
  const [filtros, setFiltros] = useState({
    desde: haceDias(6),
    hasta: hoyIso(),
    tipo_documento: ''
  });
  const { datos, cargando, error, recargar } = useConsulta('/ventas', { ...filtros, limite: 1000 });
  const [elegida, setElegida] = useState(null);

  const ventas = datos || [];
  const emitidas = ventas.filter((venta) => venta.estado === 'emitida');
  const total = emitidas.reduce((suma, venta) => suma + venta.total, 0);

  const columnas = [
    { titulo: 'Número', celda: (v) => <span className="font-semibold">{v.numero}</span> },
    { titulo: 'Fecha', celda: (v) => fechaHora(v.fecha) },
    { titulo: 'Cliente', celda: (v) => v.cliente?.nombre || 'Consumidor final' },
    { titulo: 'Pago', celda: (v) => v.pagos.map((pago) => NOMBRE_METODO[pago.metodo]).join(' y ') },
    {
      titulo: 'Estado',
      celda: (v) =>
        v.estado === 'anulada' ? (
          <Etiqueta tono="mal">Anulada</Etiqueta>
        ) : (
          <Etiqueta tono="bien">Emitida</Etiqueta>
        )
    },
    {
      titulo: 'Total',
      derecha: true,
      celda: (v) => (
        <span className={v.estado === 'anulada' ? 'text-piedra-400 line-through' : 'font-semibold'}>
          {dinero(v.total)}
        </span>
      )
    }
  ];

  return (
    <div>
      <Encabezado
        titulo="Documentos emitidos"
        detalle={`${emitidas.length} documentos vigentes por ${dinero(total)} en el período.`}
      />
      <div className="mb-4 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-3">
        <Campo
          etiqueta="Desde"
          type="date"
          value={filtros.desde}
          onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
        />
        <Campo
          etiqueta="Hasta"
          type="date"
          value={filtros.hasta}
          onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
        />
        <Selector
          etiqueta="Tipo"
          value={filtros.tipo_documento}
          onChange={(e) => setFiltros({ ...filtros, tipo_documento: e.target.value })}
          opciones={[
            { valor: '', texto: 'Todos' },
            { valor: 'FCF', texto: 'Consumidor final' },
            { valor: 'CCF', texto: 'Crédito fiscal' }
          ]}
        />
      </div>
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla
          columnas={columnas}
          filas={ventas}
          alElegir={(venta) => setElegida(venta.id)}
          vacio="No hay documentos en esas fechas"
        />
      )}
      {elegida && (
        <VerDocumento id={elegida} alCerrar={() => setElegida(null)} alAnular={recargar} />
      )}
    </div>
  );
}
