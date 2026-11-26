import { useEffect, useState } from 'react';
import api from '../api/cliente.js';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Encabezado,
  Etiqueta,
  Panel,
  Selector,
  Vacio,
  Ventana
} from '../componentes/ui.jsx';
import { cantidad, dinero } from '../utilidades/formato.js';

const FILA_PRODUCTO =
  'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm';

function claseProducto(elegido, activo) {
  const fondo = elegido ? 'bg-cafe-50' : 'hover:bg-cafe-50';
  return `${FILA_PRODUCTO} ${fondo} ${activo ? '' : 'text-piedra-400'}`;
}

const CATEGORIAS = ['Café caliente', 'Bebida fría', 'Cocina', 'Empacados'];

function EditorReceta({ receta, articulos, alCambiar }) {
  const [nuevoId, setNuevoId] = useState('');
  const usados = receta.map((componente) => componente.articulo_id);
  const disponibles = articulos.filter(
    (articulo) => articulo.tipo !== 'reventa' && !usados.includes(articulo.id)
  );

  function agregar() {
    const articulo = articulos.find((opcion) => opcion.id === Number(nuevoId));
    if (!articulo) return;
    alCambiar([
      ...receta,
      { articulo_id: articulo.id, nombre: articulo.nombre, unidad: articulo.unidad, cantidad: '' }
    ]);
    setNuevoId('');
  }

  return (
    <div className="space-y-2">
      {receta.length === 0 && (
        <p className="text-sm text-piedra-600">
          Agrega cada insumo y empaque que se gasta al preparar una unidad.
        </p>
      )}
      {receta.map((componente, indice) => (
        <div key={componente.articulo_id} className="flex items-center gap-2 text-sm">
          <span className="flex-1">{componente.nombre}</span>
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            aria-label={`Cantidad de ${componente.nombre}`}
            className="w-24 rounded-md border border-piedra-200 px-2 py-1.5 text-right"
            value={componente.cantidad}
            onChange={(e) =>
              alCambiar(
                receta.map((item, i) =>
                  i === indice ? { ...item, cantidad: e.target.value } : item
                )
              )
            }
          />
          <span className="w-12 text-piedra-600">{componente.unidad}</span>
          <button
            type="button"
            className="font-semibold text-cereza"
            onClick={() => alCambiar(receta.filter((_, i) => i !== indice))}
          >
            Quitar
          </button>
        </div>
      ))}
      <div className="flex items-end gap-2 pt-1">
        <Selector
          etiqueta="Agregar insumo o empaque"
          className="flex-1"
          value={nuevoId}
          onChange={(e) => setNuevoId(e.target.value)}
          opciones={[
            { valor: '', texto: 'Elige uno' },
            ...disponibles.map((articulo) => ({
              valor: articulo.id,
              texto: `${articulo.nombre} (${articulo.unidad})`
            }))
          ]}
        />
        <Boton variante="secundario" disabled={!nuevoId} onClick={agregar}>
          Agregar
        </Boton>
      </div>
    </div>
  );
}

function ProductoNuevo({ articulos, alCerrar, alGuardar }) {
  const { enviando, error, enviar } = useEnvio();
  const [ficha, setFicha] = useState({
    nombre: '',
    categoria: 'Café caliente',
    tipo: 'elaborado',
    precio: '',
    articulo_id: ''
  });
  const [receta, setReceta] = useState([]);
  const deReventa = articulos.filter((articulo) => articulo.tipo === 'reventa');

  async function guardar(evento) {
    evento.preventDefault();
    const cuerpo = { ...ficha, precio: Number(ficha.precio) };
    if (ficha.tipo === 'elaborado') {
      cuerpo.receta = receta.map((componente) => ({
        articulo_id: componente.articulo_id,
        cantidad: Number(componente.cantidad)
      }));
      delete cuerpo.articulo_id;
    } else if (!ficha.articulo_id) {
      delete cuerpo.articulo_id;
    }
    const creado = await enviar(() => api.crear('/productos', cuerpo));
    if (creado) alGuardar(creado);
  }

  return (
    <Ventana titulo="Producto nuevo" alCerrar={alCerrar} ancho="max-w-xl">
      <form onSubmit={guardar} className="space-y-3">
        <Aviso error={error} />
        <Campo
          etiqueta="Nombre en el menú"
          required
          value={ficha.nombre}
          onChange={(e) => setFicha({ ...ficha, nombre: e.target.value })}
        />
        <div className="grid grid-cols-3 gap-3">
          <Selector
            etiqueta="Categoría"
            value={ficha.categoria}
            onChange={(e) => setFicha({ ...ficha, categoria: e.target.value })}
            opciones={CATEGORIAS.map((c) => ({ valor: c, texto: c }))}
          />
          <Selector
            etiqueta="Tipo"
            value={ficha.tipo}
            onChange={(e) => setFicha({ ...ficha, tipo: e.target.value })}
            opciones={[
              { valor: 'elaborado', texto: 'Se prepara aquí' },
              { valor: 'reventa', texto: 'Se revende empacado' }
            ]}
          />
          <Campo
            etiqueta="Precio con IVA"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={ficha.precio}
            onChange={(e) => setFicha({ ...ficha, precio: e.target.value })}
          />
        </div>
        {ficha.tipo === 'elaborado' ? (
          <div className="linea-punteada pt-3">
            <p className="mb-2 font-semibold">Receta por unidad</p>
            <EditorReceta receta={receta} articulos={articulos} alCambiar={setReceta} />
          </div>
        ) : (
          <Selector
            etiqueta="Artículo de bodega que se descuenta"
            value={ficha.articulo_id}
            onChange={(e) => setFicha({ ...ficha, articulo_id: e.target.value })}
            opciones={[
              { valor: '', texto: 'Crear un artículo nuevo con este nombre' },
              ...deReventa.map((articulo) => ({ valor: articulo.id, texto: articulo.nombre }))
            ]}
          />
        )}
        <Boton type="submit" disabled={enviando}>
          Crear producto
        </Boton>
      </form>
    </Ventana>
  );
}

function FichaProducto({ producto, articulos, alGuardar }) {
  const guardado = useEnvio();
  const [precio, setPrecio] = useState(String(producto.precio));
  const [receta, setReceta] = useState(producto.receta);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    setPrecio(String(producto.precio));
    setReceta(producto.receta);
    setEditando(false);
  }, [producto]);

  async function guardar(evento) {
    evento.preventDefault();
    const respuesta = await guardado.enviar(async () => {
      await api.actualizar(`/productos/${producto.id}`, { precio: Number(precio) });
      if (producto.tipo === 'elaborado' && editando) {
        await api.actualizar(`/productos/${producto.id}/receta`, {
          receta: receta.map((componente) => ({
            articulo_id: componente.articulo_id,
            cantidad: Number(componente.cantidad)
          }))
        });
      }
      return true;
    });
    if (respuesta) alGuardar();
  }

  async function alternarActivo() {
    const respuesta = await guardado.enviar(() =>
      api.actualizar(`/productos/${producto.id}`, { activo: !producto.activo })
    );
    if (respuesta) alGuardar();
  }

  const neto = producto.precio / 1.13;

  return (
    <Panel
      titulo={producto.nombre}
      accion={
        <Etiqueta tono={producto.activo ? 'bien' : 'neutro'}>
          {producto.activo ? 'En el menú' : 'Fuera del menú'}
        </Etiqueta>
      }
    >
      <form onSubmit={guardar} className="space-y-4">
        <Aviso error={guardado.error} />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <Campo
            etiqueta="Precio con IVA"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
          />
          <div>
            <p className="mb-1 text-piedra-600">Costo de preparación</p>
            <p className="text-xl font-bold">{dinero(producto.costo)}</p>
          </div>
          <div>
            <p className="mb-1 text-piedra-600">Margen sobre precio sin IVA</p>
            <p className="text-xl font-bold">{producto.margen} %</p>
          </div>
        </div>
        <p className="text-sm text-piedra-600">
          Precio sin IVA {dinero(neto)}. Utilidad por unidad {dinero(neto - producto.costo)}.
        </p>

        <div className="linea-punteada pt-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-semibold">
              {producto.tipo === 'elaborado'
                ? 'Cada venta descuenta de bodega'
                : 'Producto de reventa: descuenta una unidad'}
            </p>
            {producto.tipo === 'elaborado' && !editando && (
              <button
                type="button"
                className="text-sm font-semibold text-cafe-600"
                onClick={() => setEditando(true)}
              >
                Cambiar receta
              </button>
            )}
          </div>
          {editando ? (
            <EditorReceta receta={receta} articulos={articulos} alCambiar={setReceta} />
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {producto.receta.map((componente) => (
                  <tr
                    key={componente.articulo_id}
                    className="border-b border-piedra-100 last:border-0"
                  >
                    <td className="py-1.5">{componente.nombre}</td>
                    <td className="py-1.5 text-right font-semibold">
                      {cantidad(componente.cantidad, componente.unidad)}
                    </td>
                    <td className="w-24 py-1.5 text-right text-piedra-600">
                      {dinero(componente.costo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <Boton variante="secundario" onClick={alternarActivo} disabled={guardado.enviando}>
            {producto.activo ? 'Sacar del menú' : 'Volver a poner en el menú'}
          </Boton>
          <Boton type="submit" disabled={guardado.enviando}>
            Guardar cambios
          </Boton>
        </div>
      </form>
    </Panel>
  );
}

export default function Menu() {
  const productos = useConsulta('/productos');
  const articulos = useConsulta('/articulos', { activos: 'true' });
  const [elegidoId, setElegidoId] = useState(null);
  const [creando, setCreando] = useState(false);

  if (productos.cargando && !productos.datos) return <Cargando />;

  const lista = productos.datos || [];
  const elegido = lista.find((producto) => producto.id === elegidoId) || null;
  const elaborados = lista.filter((producto) => producto.tipo === 'elaborado').length;

  return (
    <div>
      <Encabezado
        titulo="Menú y recetas"
        detalle={`${elaborados} productos se preparan en la sucursal y ${
          lista.length - elaborados
        } se revenden empacados.`}
      >
        <Boton onClick={() => setCreando(true)}>Agregar producto</Boton>
      </Encabezado>
      <Aviso error={productos.error || articulos.error} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-5">
          {CATEGORIAS.map((categoria) => {
            const deCategoria = lista.filter((producto) => producto.categoria === categoria);
            if (deCategoria.length === 0) return null;
            return (
              <section key={categoria}>
                <h2 className="mb-1.5 text-xl text-cafe-900">{categoria}</h2>
                <ul className="overflow-hidden rounded-lg border border-piedra-200 bg-white">
                  {deCategoria.map((producto) => (
                    <li key={producto.id} className="border-b border-piedra-100 last:border-0">
                      <button
                        type="button"
                        onClick={() => setElegidoId(producto.id)}
                        className={claseProducto(elegidoId === producto.id, producto.activo)}
                      >
                        <span className="font-semibold">{producto.nombre}</span>
                        <span className="flex items-center gap-3">
                          <span className="text-piedra-600">margen {producto.margen} %</span>
                          <span className="w-16 text-right font-semibold">
                            {dinero(producto.precio)}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {elegido ? (
            <FichaProducto
              producto={elegido}
              articulos={articulos.datos || []}
              alGuardar={productos.recargar}
            />
          ) : (
            <Vacio titulo="Elige un producto">
              Aquí verás su receta, lo que cuesta prepararlo y el margen que deja.
            </Vacio>
          )}
        </div>
      </div>

      {creando && (
        <ProductoNuevo
          articulos={articulos.datos || []}
          alCerrar={() => setCreando(false)}
          alGuardar={(creado) => {
            setCreando(false);
            setElegidoId(creado.id);
            productos.recargar();
            articulos.recargar();
          }}
        />
      )}
    </div>
  );
}
