import { useState } from 'react';
import api from '../api/cliente.js';
import { useSesion } from '../contexto/Sesion.jsx';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import BarraNivel from '../componentes/BarraNivel.jsx';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Encabezado,
  Etiqueta,
  Pestanas,
  Selector,
  Tabla,
  Ventana
} from '../componentes/ui.jsx';
import { cantidad, dinero, fechaHora, haceDias, hoyIso } from '../utilidades/formato.js';

const AVISO_MINIMO =
  'mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-maiz/50 ' +
  'bg-maiz-100 px-4 py-3';

function describirGrupo(grupo) {
  return `${grupo.total.toLocaleString('es-SV')} de ${NOMBRE_MOVIMIENTO[grupo.tipo].toLowerCase()}`;
}

const NOMBRE_TIPO = { insumo: 'Insumo', empaque: 'Empaque', reventa: 'Reventa' };
const NOMBRE_MOVIMIENTO = {
  compra: 'Compra',
  venta: 'Venta',
  anulacion: 'Anulación',
  ajuste: 'Ajuste de conteo',
  merma: 'Merma'
};

function Ajuste({ existencia, alCerrar, alGuardar }) {
  const { enviando, error, enviar } = useEnvio();
  const [tipo, setTipo] = useState('ajuste');
  const [valor, setValor] = useState('');
  const [nota, setNota] = useState('');
  const [minimo, setMinimo] = useState(String(existencia.minimo));

  async function guardar(evento) {
    evento.preventDefault();
    const respuesta = await enviar(async () => {
      if (Number(minimo) !== existencia.minimo) {
        await api.actualizar(`/existencias/${existencia.articulo_id}/minimo`, {
          minimo: Number(minimo)
        });
      }
      if (valor !== '') {
        await api.crear('/ajustes-inventario', {
          articulo_id: existencia.articulo_id,
          cantidad: Number(valor),
          tipo,
          nota
        });
      }
      return true;
    });
    if (respuesta) alGuardar();
  }

  return (
    <Ventana titulo={existencia.nombre} alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <p className="text-sm text-piedra-600">
          Hay {cantidad(existencia.cantidad, existencia.unidad)} en esta sucursal.
        </p>
        <Aviso error={error} />
        <Campo
          etiqueta={`Existencia mínima (${existencia.unidad})`}
          type="number"
          min="0"
          step="0.001"
          value={minimo}
          onChange={(e) => setMinimo(e.target.value)}
          ayuda="Cuando la existencia llega a este punto aparece la alerta."
        />
        <div className="linea-punteada space-y-3 pt-3">
          <Selector
            etiqueta="Corrección de existencia"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            opciones={[
              { valor: 'ajuste', texto: 'Conteo físico: escribir la cantidad real' },
              { valor: 'merma', texto: 'Merma: restar lo que se perdió' }
            ]}
          />
          <Campo
            etiqueta={
              tipo === 'ajuste'
                ? `Cantidad contada (${existencia.unidad})`
                : `Cantidad perdida (${existencia.unidad})`
            }
            type="number"
            min="0"
            step="0.001"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
          />
          <Campo
            etiqueta="Motivo"
            required={valor !== ''}
            placeholder="Derrame, vencimiento, conteo mensual…"
            value={nota}
            onChange={(e) => setNota(e.target.value)}
          />
        </div>
        <Boton type="submit" disabled={enviando}>
          Guardar cambios
        </Boton>
      </form>
    </Ventana>
  );
}

function ArticuloNuevo({ alCerrar, alGuardar }) {
  const { enviando, error, enviar } = useEnvio();
  const [ficha, setFicha] = useState({ nombre: '', tipo: 'insumo', unidad: 'g', minimo: '' });

  async function guardar(evento) {
    evento.preventDefault();
    const respuesta = await enviar(() =>
      api.crear('/articulos', { ...ficha, minimo: Number(ficha.minimo) || 0 })
    );
    if (respuesta) alGuardar();
  }

  return (
    <Ventana titulo="Artículo nuevo" alCerrar={alCerrar}>
      <form onSubmit={guardar} className="space-y-3">
        <Aviso error={error} />
        <Campo
          etiqueta="Nombre"
          required
          value={ficha.nombre}
          onChange={(e) => setFicha({ ...ficha, nombre: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <Selector
            etiqueta="Tipo"
            value={ficha.tipo}
            onChange={(e) => setFicha({ ...ficha, tipo: e.target.value })}
            opciones={Object.entries(NOMBRE_TIPO).map(([valor, texto]) => ({ valor, texto }))}
          />
          <Selector
            etiqueta="Unidad de medida"
            value={ficha.unidad}
            onChange={(e) => setFicha({ ...ficha, unidad: e.target.value })}
            opciones={[
              { valor: 'g', texto: 'Gramos' },
              { valor: 'ml', texto: 'Mililitros' },
              { valor: 'unidad', texto: 'Unidades' }
            ]}
          />
        </div>
        <Campo
          etiqueta="Existencia mínima"
          type="number"
          min="0"
          step="0.001"
          value={ficha.minimo}
          onChange={(e) => setFicha({ ...ficha, minimo: e.target.value })}
          ayuda="El artículo entra a bodega con una compra."
        />
        <Boton type="submit" disabled={enviando}>
          Crear artículo
        </Boton>
      </form>
    </Ventana>
  );
}

function Existencias({ esJefatura }) {
  const [filtros, setFiltros] = useState({ tipo: '', buscar: '' });
  const [soloBajos, setSoloBajos] = useState(false);
  const { datos, cargando, error, recargar } = useConsulta('/existencias', filtros);
  const [elegida, setElegida] = useState(null);
  const [creando, setCreando] = useState(false);

  const todas = datos || [];
  const bajos = todas.filter((existencia) => existencia.bajo_minimo);
  const filas = soloBajos ? bajos : todas;
  const valorTotal = todas.reduce((suma, existencia) => suma + existencia.valor, 0);

  const columnas = [
    { titulo: 'Artículo', celda: (e) => <span className="font-semibold">{e.nombre}</span> },
    { titulo: 'Tipo', celda: (e) => NOMBRE_TIPO[e.tipo] },
    { titulo: 'Nivel', celda: (e) => <BarraNivel cantidad={e.cantidad} minimo={e.minimo} /> },
    { titulo: 'Existencia', derecha: true, celda: (e) => cantidad(e.cantidad, e.unidad) },
    { titulo: 'Mínimo', derecha: true, celda: (e) => cantidad(e.minimo, e.unidad) },
    {
      titulo: 'Estado',
      celda: (e) =>
        e.cantidad <= 0 ? (
          <Etiqueta tono="mal">Agotado</Etiqueta>
        ) : e.bajo_minimo ? (
          <Etiqueta tono="alerta">Bajo el mínimo</Etiqueta>
        ) : (
          <Etiqueta tono="bien">Suficiente</Etiqueta>
        )
    },
    { titulo: 'Valor en bodega', derecha: true, celda: (e) => dinero(e.valor) }
  ];

  return (
    <>
      {bajos.length > 0 && (
        <div className={AVISO_MINIMO}>
          <p className="text-sm font-semibold text-maiz-700">
            {bajos.length} artículos llegaron a su mínimo:{' '}
            {bajos
              .slice(0, 4)
              .map((e) => e.nombre)
              .join(', ')}
            {bajos.length > 4 ? ' y otros' : ''}.
          </p>
          <Boton variante="secundario" onClick={() => setSoloBajos(!soloBajos)}>
            {soloBajos ? 'Ver todos los artículos' : 'Ver solo los que faltan'}
          </Boton>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Campo
          etiqueta="Buscar"
          className="w-56"
          value={filtros.buscar}
          onChange={(e) => setFiltros({ ...filtros, buscar: e.target.value })}
        />
        <Selector
          etiqueta="Tipo"
          className="w-40"
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
          opciones={[
            { valor: '', texto: 'Todos' },
            ...Object.entries(NOMBRE_TIPO).map(([valor, texto]) => ({ valor, texto }))
          ]}
        />
        <p className="ml-auto text-sm text-piedra-600">
          Valor en bodega: <strong className="text-tinta">{dinero(valorTotal)}</strong>
        </p>
        {esJefatura && <Boton onClick={() => setCreando(true)}>Agregar artículo</Boton>}
      </div>

      <Aviso error={error} />
      {cargando && !datos ? (
        <Cargando />
      ) : (
        <Tabla
          columnas={columnas}
          filas={filas}
          alElegir={esJefatura ? setElegida : undefined}
          vacio="Ningún artículo coincide"
        />
      )}

      {elegida && (
        <Ajuste
          existencia={elegida}
          alCerrar={() => setElegida(null)}
          alGuardar={() => {
            setElegida(null);
            recargar();
          }}
        />
      )}
      {creando && (
        <ArticuloNuevo
          alCerrar={() => setCreando(false)}
          alGuardar={() => {
            setCreando(false);
            recargar();
          }}
        />
      )}
    </>
  );
}

function Movimientos() {
  const [filtros, setFiltros] = useState({ tipo: '', desde: haceDias(6), hasta: hoyIso() });
  const { datos, cargando, error } = useConsulta('/movimientos-inventario', {
    ...filtros,
    limite: 1000
  });
  const conteo = useConsulta('/movimientos-inventario/resumen', filtros);
  const movimientos = datos || [];
  const porTipo = (conteo.datos || []).sort((a, b) => b.total - a.total);
  const totalDelPeriodo = porTipo.reduce((suma, grupo) => suma + grupo.total, 0);

  const columnas = [
    { titulo: 'Fecha', celda: (m) => fechaHora(m.creado_en) },
    {
      titulo: 'Artículo',
      celda: (m) => <span className="font-semibold">{m.articulo.nombre}</span>
    },
    {
      titulo: 'Movimiento',
      celda: (m) =>
        m.origen === 'inicial'
          ? 'Inventario inicial'
          : `${NOMBRE_MOVIMIENTO[m.tipo]}${m.origen_id ? ` n.º ${m.origen_id}` : ''}`
    },
    {
      titulo: 'Cantidad',
      derecha: true,
      celda: (m) => (
        <span className={m.cantidad < 0 ? 'text-cereza' : 'text-hoja'}>
          {m.cantidad > 0 ? '+' : '−'}
          {cantidad(Math.abs(m.cantidad), m.articulo.unidad)}
        </span>
      )
    },
    { titulo: 'Saldo', derecha: true, celda: (m) => cantidad(m.saldo, m.articulo.unidad) },
    { titulo: 'Responsable', celda: (m) => m.usuario.nombre },
    { titulo: 'Nota', celda: (m) => m.nota || '' }
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <Selector
          etiqueta="Tipo de movimiento"
          className="w-56"
          value={filtros.tipo}
          onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
          opciones={[
            { valor: '', texto: 'Todos' },
            ...Object.entries(NOMBRE_MOVIMIENTO).map(([valor, texto]) => ({ valor, texto }))
          ]}
        />
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
      </div>
      {porTipo.length > 0 && (
        <p className="mb-4 text-sm text-piedra-600">
          {totalDelPeriodo.toLocaleString('es-SV')} movimientos en el período
          {filtros.tipo === '' && `: ${porTipo.map(describirGrupo).join(', ')}`}.
          {totalDelPeriodo > movimientos.length &&
            ` La tabla muestra los ${movimientos.length.toLocaleString('es-SV')} más recientes; ` +
              'acorta las fechas o elige un tipo para ver el resto.'}
        </p>
      )}
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla columnas={columnas} filas={movimientos} vacio="No hay movimientos en esas fechas" />
      )}
    </>
  );
}

export default function Inventario() {
  const { esJefatura, sucursal } = useSesion();
  const [pestana, setPestana] = useState('existencias');

  return (
    <div>
      <Encabezado
        titulo="Existencias"
        detalle={`Insumos, empaques y productos de reventa en la sucursal ${sucursal?.nombre}.`}
      />
      {esJefatura && (
        <Pestanas
          activa={pestana}
          alCambiar={setPestana}
          opciones={[
            { valor: 'existencias', texto: 'En bodega' },
            { valor: 'movimientos', texto: 'Entradas y salidas' }
          ]}
        />
      )}
      {pestana === 'existencias' ? <Existencias esJefatura={esJefatura} /> : <Movimientos />}
    </div>
  );
}
