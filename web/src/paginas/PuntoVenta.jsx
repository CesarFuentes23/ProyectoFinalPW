import { useEffect, useMemo, useState } from 'react';
import api from '../api/cliente.js';
import { useSesion } from '../contexto/Sesion.jsx';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import Documento from '../componentes/Documento.jsx';
import { Aviso, Boton, Campo, Cargando, Selector, Vacio, Ventana } from '../componentes/ui.jsx';
import { dinero, NOMBRE_METODO, redondear } from '../utilidades/formato.js';

const CIRCULO_CATEGORIA =
  'grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-tinta';
const TARJETA_CAJA =
  'mx-auto mt-16 max-w-sm space-y-4 rounded-xl border-2 border-tinta bg-white p-6 shadow-sello';
const BOTON_CATEGORIA = 'rounded-full border-2 px-3.5 py-1 text-sm font-bold';
const CATEGORIA_ACTIVA = 'border-tinta bg-maiz text-tinta shadow-[2px_2px_0_#1f1a17]';
const CATEGORIA_NORMAL = 'border-piedra-200 bg-white text-piedra-600 hover:border-tinta';
const TARJETA_PRODUCTO =
  'flex h-full min-h-32 w-full flex-col justify-between gap-2 rounded-xl border-2 border-tinta ' +
  'bg-white p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sello ' +
  'disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none';
const SELECTOR_DOCUMENTO =
  'grid grid-cols-2 gap-1 rounded-md bg-piedra-100 p-1 text-sm font-semibold';
const DOCUMENTO_ACTIVO = 'bg-white shadow-sm';
const METODO_ACTIVO = 'border-cafe-600 bg-cafe-50 text-cafe-800';

function claseCategoria(activa) {
  return `${BOTON_CATEGORIA} ${activa ? CATEGORIA_ACTIVA : CATEGORIA_NORMAL}`;
}

function claseDocumento(activo) {
  return `rounded py-1.5 ${activo ? DOCUMENTO_ACTIVO : 'text-piedra-600'}`;
}

const CATEGORIAS = {
  'Café caliente': {
    fondo: 'bg-cereza text-white',
    trazo:
      'M5 9h11v4a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10h1.5a2.5 2.5 0 0 1 0 5H16' +
      'M8 3c-1 1.5 1 2.5 0 4M12 3c-1 1.5 1 2.5 0 4'
  },
  'Bebida fría': {
    fondo: 'bg-laguna text-white',
    trazo: 'M6 7h12l-1.5 14h-9zM12 7l2-5 3 1M7 11h10'
  },
  Cocina: {
    fondo: 'bg-hoja text-white',
    trazo:
      'M4 3v5a1.5 1.5 0 0 0 3 0V3M5.5 8v13M20 3c-2 2-2 6 0 8v10' +
      'M13.5 8a3.5 3.5 0 1 0 0 7a3.5 3.5 0 1 0 0-7'
  },
  Empacados: { fondo: 'bg-maiz text-tinta', trazo: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2' }
};

function IconoCategoria({ categoria }) {
  const datos = CATEGORIAS[categoria] || { fondo: 'bg-piedra-200 text-tinta', trazo: 'M6 12h12' };
  return (
    <span className={`${CIRCULO_CATEGORIA} ${datos.fondo}`} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={datos.trazo} />
      </svg>
    </span>
  );
}

const METODOS = ['efectivo', 'tarjeta', 'bitcoin'];
const PAGO_VACIO = { efectivo: '', tarjeta: '', bitcoin: '' };

function AbrirCaja({ alAbrir }) {
  const { enviando, error, enviar } = useEnvio();
  const [fondo, setFondo] = useState('50');

  async function abrir(evento) {
    evento.preventDefault();
    const turno = await enviar(() => api.crear('/turnos', { fondo_inicial: Number(fondo) }));
    if (turno) alAbrir();
  }

  return (
    <form onSubmit={abrir} className={TARJETA_CAJA}>
      <h1 className="text-3xl text-cafe-900">Abre tu caja para vender</h1>
      <p className="text-sm text-piedra-600">
        Cuenta el efectivo con el que inicias el turno. Ese fondo se usa para cuadrar la caja al
        cierre.
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
      <Boton type="submit" grande className="w-full" disabled={enviando}>
        Abrir caja
      </Boton>
    </form>
  );
}

const TIPOS_CONTRIBUYENTE = [
  { valor: 'sociedad', texto: 'Sociedad' },
  { valor: 'persona_natural', texto: 'Persona natural' }
];
const NOMBRE_TIPO = { sociedad: 'Sociedad', persona_natural: 'Persona natural' };
const FORMATO_NIT_SOCIEDAD = '\\d{4}-\\d{6}-\\d{3}-\\d';
const FORMATO_NIT_PERSONA = '\\d{8}-\\d|\\d{4}-\\d{6}-\\d{3}-\\d';

function ElegirCliente({ cliente, alElegir }) {
  const [buscar, setBuscar] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const { datos: clientes } = useConsulta('/clientes', { buscar });
  const { enviando, error, enviar } = useEnvio();
  const [ficha, setFicha] = useState({
    nombre: '',
    tipo_contribuyente: 'sociedad',
    nit: '',
    nrc: '',
    giro: '',
    direccion: ''
  });
  const esSociedad = ficha.tipo_contribuyente === 'sociedad';

  async function guardar(evento) {
    evento.preventDefault();
    const creado = await enviar(() => api.crear('/clientes', ficha));
    if (creado) {
      alElegir(creado);
      setNuevo(false);
    }
  }

  if (cliente) {
    return (
      <div className="rounded-md bg-cafe-50 px-3 py-2 text-sm">
        <p className="font-semibold">{cliente.nombre}</p>
        <p className="text-piedra-600">
          {NOMBRE_TIPO[cliente.tipo_contribuyente]}, NIT {cliente.nit} y NRC {cliente.nrc}
        </p>
        <button
          type="button"
          className="mt-1 font-semibold text-cafe-600"
          onClick={() => alElegir(null)}
        >
          Cambiar cliente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Campo
        etiqueta="Cliente del crédito fiscal"
        placeholder="Busca por nombre, NIT o NRC"
        value={buscar}
        onChange={(e) => setBuscar(e.target.value)}
      />
      <ul className="max-h-32 overflow-y-auto text-sm">
        {(clientes || []).map((opcion) => (
          <li key={opcion.id}>
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left hover:bg-cafe-50"
              onClick={() => alElegir(opcion)}
            >
              {opcion.nombre} <span className="text-piedra-400">{opcion.nrc}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="text-sm font-semibold text-cafe-600"
        onClick={() => setNuevo(true)}
      >
        Registrar cliente nuevo
      </button>

      {nuevo && (
        <Ventana titulo="Cliente nuevo" alCerrar={() => setNuevo(false)}>
          <form onSubmit={guardar} className="space-y-3">
            <Aviso error={error} />
            <Campo
              etiqueta="Nombre o razón social"
              required
              value={ficha.nombre}
              onChange={(e) => setFicha({ ...ficha, nombre: e.target.value })}
            />
            <Selector
              etiqueta="Tipo de contribuyente"
              value={ficha.tipo_contribuyente}
              onChange={(e) => setFicha({ ...ficha, tipo_contribuyente: e.target.value })}
              opciones={TIPOS_CONTRIBUYENTE}
            />
            <div className="grid grid-cols-2 gap-3">
              <Campo
                etiqueta={esSociedad ? 'NIT' : 'DUI o NIT'}
                required
                placeholder={esSociedad ? '0614-140217-106-3' : '01234567-8'}
                pattern={esSociedad ? FORMATO_NIT_SOCIEDAD : FORMATO_NIT_PERSONA}
                title={
                  esSociedad
                    ? 'Escribe el NIT de 14 dígitos con guiones, por ejemplo 0614-140217-106-3.'
                    : 'Escribe el DUI con guion (01234567-8) o el NIT de 14 dígitos.'
                }
                value={ficha.nit}
                onChange={(e) => setFicha({ ...ficha, nit: e.target.value })}
              />
              <Campo
                etiqueta="NRC"
                required
                value={ficha.nrc}
                onChange={(e) => setFicha({ ...ficha, nrc: e.target.value })}
              />
            </div>
            <Campo
              etiqueta="Giro"
              value={ficha.giro}
              onChange={(e) => setFicha({ ...ficha, giro: e.target.value })}
            />
            <Campo
              etiqueta="Dirección"
              value={ficha.direccion}
              onChange={(e) => setFicha({ ...ficha, direccion: e.target.value })}
            />
            <Boton type="submit" disabled={enviando}>
              Guardar cliente
            </Boton>
          </form>
        </Ventana>
      )}
    </div>
  );
}

export default function PuntoVenta() {
  const { sucursal } = useSesion();
  const turno = useConsulta('/turnos/actual');
  const menu = useConsulta('/menu');
  const cobro = useEnvio();

  const [categoria, setCategoria] = useState('Todo');
  const [buscar, setBuscar] = useState('');
  const [pedido, setPedido] = useState([]);
  const [tipoDocumento, setTipoDocumento] = useState('FCF');
  const [cliente, setCliente] = useState(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [mixto, setMixto] = useState(false);
  const [montos, setMontos] = useState(PAGO_VACIO);
  const [recibido, setRecibido] = useState('');
  const [emitida, setEmitida] = useState(null);

  useEffect(() => {
    setPedido([]);
  }, [sucursal?.id]);

  const productos = menu.datos || [];
  const categorias = useMemo(
    () => ['Todo', ...new Set(productos.map((producto) => producto.categoria))],
    [productos]
  );
  const visibles = productos.filter((producto) => {
    const enCategoria = categoria === 'Todo' || producto.categoria === categoria;
    return enCategoria && producto.nombre.toLowerCase().includes(buscar.toLowerCase());
  });

  const total = redondear(pedido.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0));
  const subtotal = redondear(total / 1.13);
  const iva = redondear(total - subtotal);

  const pagos = mixto
    ? METODOS.filter((m) => Number(montos[m]) > 0).map((m) => ({
        metodo: m,
        monto: redondear(montos[m])
      }))
    : [{ metodo, monto: total }];
  const pagado = redondear(pagos.reduce((suma, pago) => suma + pago.monto, 0));
  const enEfectivo = pagos
    .filter((pago) => pago.metodo === 'efectivo')
    .reduce((suma, pago) => suma + pago.monto, 0);
  const cambio = recibido !== '' ? redondear(Number(recibido) - enEfectivo) : 0;

  const porId = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos]
  );

  const usoDelPedido = useMemo(() => {
    const uso = new Map();
    pedido.forEach((linea) => {
      porId.get(linea.id)?.receta.forEach((componente) => {
        uso.set(
          componente.articulo_id,
          (uso.get(componente.articulo_id) || 0) + componente.cantidad * linea.cantidad
        );
      });
    });
    return uso;
  }, [pedido, porId]);

  function cuantosMasCaben(producto) {
    if (!producto.receta?.length) return 0;
    return Math.min(
      ...producto.receta.map((componente) => {
        const libre = componente.existencia - (usoDelPedido.get(componente.articulo_id) || 0);
        return Math.floor(libre / componente.cantidad + 1e-9);
      })
    );
  }

  const enCaja = turno.datos?.resumen?.esperado?.efectivo ?? 0;
  const faltaCambio = cambio > 0 && cambio > enCaja;

  const listoParaCobrar =
    pedido.length > 0 &&
    pagado === total &&
    cambio >= 0 &&
    !faltaCambio &&
    (tipoDocumento === 'FCF' || cliente);

  function agregar(producto) {
    cobro.limpiarError();
    if (cuantosMasCaben(producto) <= 0) return;
    setPedido((actual) => {
      const existente = actual.find((linea) => linea.id === producto.id);
      if (existente) {
        return actual.map((linea) =>
          linea.id === producto.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea
        );
      }
      return [
        ...actual,
        { id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1 }
      ];
    });
  }

  function cambiarCantidad(id, paso) {
    const producto = porId.get(id);
    if (paso > 0 && (!producto || cuantosMasCaben(producto) <= 0)) return;
    setPedido((actual) =>
      actual
        .map((linea) => (linea.id === id ? { ...linea, cantidad: linea.cantidad + paso } : linea))
        .filter((linea) => linea.cantidad > 0)
    );
  }

  function limpiar() {
    setPedido([]);
    setCliente(null);
    setTipoDocumento('FCF');
    setMetodo('efectivo');
    setMixto(false);
    setMontos(PAGO_VACIO);
    setRecibido('');
  }

  async function cobrar() {
    const venta = await cobro.enviar(() =>
      api.crear('/ventas', {
        tipo_documento: tipoDocumento,
        cliente_id: cliente ? cliente.id : null,
        lineas: pedido.map((linea) => ({ producto_id: linea.id, cantidad: linea.cantidad })),
        pagos,
        efectivo_recibido: enEfectivo > 0 && recibido !== '' ? Number(recibido) : undefined
      })
    );
    if (venta) {
      setEmitida(venta);
      limpiar();
      menu.recargar();
      turno.recargar();
    }
  }

  if ((turno.cargando && !turno.datos) || (menu.cargando && !menu.datos)) return <Cargando />;
  if (!turno.datos) return <AbrirCaja alAbrir={turno.recargar} />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_23rem]">
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h1 className="mr-auto text-3xl text-cafe-900">Vender</h1>
          <input
            type="search"
            aria-label="Buscar producto"
            placeholder="Buscar producto"
            className="w-56 rounded-full border-2 border-tinta bg-white px-4 py-2 text-sm"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {categorias.map((nombre) => (
            <button
              key={nombre}
              type="button"
              onClick={() => setCategoria(nombre)}
              className={claseCategoria(categoria === nombre)}
            >
              {nombre}
            </button>
          ))}
        </div>

        <Aviso error={menu.error} />
        {visibles.length === 0 && (
          <Vacio titulo="Ningún producto coincide">
            Prueba con otra categoría o borra la búsqueda.
          </Vacio>
        )}

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 2xl:grid-cols-4">
          {visibles.map((producto) => {
            const quedan = cuantosMasCaben(producto);
            const agotado = quedan <= 0;
            const colorQuedan = agotado
              ? 'font-bold text-cereza'
              : quedan <= 10
                ? 'font-semibold text-maiz-700'
                : 'text-piedra-400';
            return (
              <li key={producto.id}>
                <button
                  type="button"
                  disabled={agotado}
                  onClick={() => agregar(producto)}
                  className={TARJETA_PRODUCTO}
                >
                  <span className="flex items-start gap-2.5">
                    <IconoCategoria categoria={producto.categoria} />
                    <span className="font-bold leading-snug">{producto.nombre}</span>
                  </span>
                  <span className="mt-2 flex items-end justify-between">
                    <span className="font-titulo text-2xl font-bold text-cafe-800">
                      {dinero(producto.precio)}
                    </span>
                    <span className={`text-xs ${colorQuedan}`}>
                      {agotado
                        ? producto.disponibles > 0
                          ? 'Sin insumos para más'
                          : 'Agotado'
                        : `Quedan ${quedan}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="tiquete px-4 pt-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl text-cafe-900">Pedido</h2>
            {pedido.length > 0 && (
              <button type="button" className="text-sm font-semibold text-cereza" onClick={limpiar}>
                Vaciar
              </button>
            )}
          </div>

          {pedido.length === 0 ? (
            <p className="py-8 text-center text-sm text-piedra-400">
              Toca un producto para agregarlo al pedido.
            </p>
          ) : (
            <ul className="mt-2">
              {pedido.map((linea) => (
                <li
                  key={linea.id}
                  className="linea-punteada flex items-center gap-2 py-2 text-sm first:border-0"
                >
                  <div className="flex items-center rounded-md border border-piedra-200">
                    <button
                      type="button"
                      aria-label={`Quitar un ${linea.nombre}`}
                      className="px-2.5 py-1 font-bold"
                      onClick={() => cambiarCantidad(linea.id, -1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">{linea.cantidad}</span>
                    <button
                      type="button"
                      aria-label={`Agregar un ${linea.nombre}`}
                      className="px-2.5 py-1 font-bold disabled:opacity-30"
                      disabled={!porId.get(linea.id) || cuantosMasCaben(porId.get(linea.id)) <= 0}
                      onClick={() => cambiarCantidad(linea.id, 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className="flex-1 leading-tight">{linea.nombre}</span>
                  <span className="font-semibold">{dinero(linea.precio * linea.cantidad)}</span>
                </li>
              ))}
            </ul>
          )}

          <dl className="linea-punteada mt-2 space-y-0.5 pt-2 text-sm">
            <div className="flex justify-between text-piedra-600">
              <dt>Subtotal sin IVA</dt>
              <dd>{dinero(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-piedra-600">
              <dt>IVA 13 %</dt>
              <dd>{dinero(iva)}</dd>
            </div>
            <div className="flex justify-between font-titulo text-3xl font-bold">
              <dt>Total</dt>
              <dd>{dinero(total)}</dd>
            </div>
          </dl>

          <div className="linea-punteada mt-3 space-y-3 pt-3">
            <div className={SELECTOR_DOCUMENTO}>
              <button
                type="button"
                className={claseDocumento(tipoDocumento === 'FCF')}
                onClick={() => setTipoDocumento('FCF')}
              >
                Consumidor final
              </button>
              <button
                type="button"
                className={claseDocumento(tipoDocumento === 'CCF')}
                onClick={() => setTipoDocumento('CCF')}
              >
                Crédito fiscal
              </button>
            </div>
            {tipoDocumento === 'CCF' && <ElegirCliente cliente={cliente} alElegir={setCliente} />}

            {!mixto ? (
              <div className="grid grid-cols-3 gap-1.5">
                {METODOS.map((opcion) => (
                  <button
                    key={opcion}
                    type="button"
                    onClick={() => setMetodo(opcion)}
                    className={`rounded-md border py-2 text-sm font-semibold ${
                      metodo === opcion ? METODO_ACTIVO : 'border-piedra-200'
                    }`}
                  >
                    {NOMBRE_METODO[opcion]}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {METODOS.map((opcion) => (
                  <Campo
                    key={opcion}
                    etiqueta={NOMBRE_METODO[opcion]}
                    type="number"
                    min="0"
                    step="0.01"
                    value={montos[opcion]}
                    onChange={(e) => setMontos({ ...montos, [opcion]: e.target.value })}
                  />
                ))}
              </div>
            )}
            <button
              type="button"
              className="text-sm font-semibold text-cafe-600"
              onClick={() => setMixto(!mixto)}
            >
              {mixto ? 'Cobrar con un solo método' : 'Dividir el pago entre métodos'}
            </button>

            {enEfectivo > 0 && (
              <div className="flex items-end gap-3">
                <Campo
                  etiqueta="Efectivo recibido"
                  type="number"
                  min="0"
                  step="0.01"
                  className="flex-1"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                />
                <p className="pb-2 text-sm">
                  Cambio{' '}
                  <strong className="font-titulo text-xl">{dinero(Math.max(cambio, 0))}</strong>
                </p>
              </div>
            )}

            {mixto && pagado !== total && pedido.length > 0 && (
              <Aviso tono="alerta">
                Los pagos suman {dinero(pagado)} y el total es {dinero(total)}.
              </Aviso>
            )}
            {cambio < 0 && <Aviso tono="alerta">El efectivo recibido no cubre el pago.</Aviso>}
            {faltaCambio && (
              <Aviso tono="alerta">
                {`No hay suficiente efectivo en caja para dar ${dinero(cambio)} de cambio. ` +
                  `En caja hay ${dinero(enCaja)}. ` +
                  'Pide un billete más pequeño o cobra con otro método.'}
              </Aviso>
            )}
            <Aviso error={cobro.error} />

            <Boton
              grande
              className="w-full"
              disabled={!listoParaCobrar || cobro.enviando}
              onClick={cobrar}
            >
              {cobro.enviando ? 'Cobrando…' : `Cobrar ${dinero(total)}`}
            </Boton>
          </div>
        </div>
      </aside>

      {emitida && (
        <Ventana titulo="Venta cobrada" alCerrar={() => setEmitida(null)} ancho="max-w-md">
          <Documento venta={emitida} />
          <div className="no-imprimir mt-4 flex justify-end gap-2">
            <Boton variante="secundario" onClick={() => window.print()}>
              Imprimir
            </Boton>
            <Boton onClick={() => setEmitida(null)}>Nueva venta</Boton>
          </div>
        </Ventana>
      )}
    </div>
  );
}
