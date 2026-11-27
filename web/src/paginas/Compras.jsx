import { useState } from 'react';
import api from '../api/cliente.js';
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
  Pestanas,
  Selector,
  Tabla,
  Ventana
} from '../componentes/ui.jsx';
import { dinero, fecha, hoyIso, redondear } from '../utilidades/formato.js';

const METODOS_PAGO = [
  { valor: 'transferencia', texto: 'Transferencia' },
  { valor: 'efectivo', texto: 'Efectivo' },
  { valor: 'cheque', texto: 'Cheque' },
  { valor: 'tarjeta', texto: 'Tarjeta' }
];
const LINEA_VACIA = { articulo_id: '', descripcion: '', cantidad: '', costo_unitario: '' };

function CompraNueva({ alCerrar, alGuardar }) {
  const proveedores = useConsulta('/proveedores');
  const { enviando, error, enviar } = useEnvio();
  const [ficha, setFicha] = useState({
    proveedor_id: '',
    tipo_documento: 'CCF',
    numero_documento: '',
    fecha: hoyIso(),
    condicion: 'credito',
    metodo_pago: 'efectivo'
  });
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }]);

  const suma = redondear(
    lineas.reduce(
      (total, linea) => total + (Number(linea.cantidad) || 0) * (Number(linea.costo_unitario) || 0),
      0
    )
  );
  const iva = ficha.tipo_documento === 'CCF' ? redondear(suma * 0.13) : 0;

  const proveedor = (proveedores.datos || []).find((p) => p.id === Number(ficha.proveedor_id));
  const catalogo = proveedor ? proveedor.catalogo : [];

  function elegirProveedor(id) {
    setFicha({ ...ficha, proveedor_id: id });
    setLineas([{ ...LINEA_VACIA }]);
  }

  function cambiarLinea(indice, campo, valor) {
    setLineas(lineas.map((linea, i) => (i === indice ? { ...linea, [campo]: valor } : linea)));
  }

  function elegirArticulo(indice, articuloId) {
    const precio = catalogo.find((item) => item.articulo_id === Number(articuloId));
    setLineas(
      lineas.map((linea, i) =>
        i === indice
          ? { ...linea, articulo_id: articuloId, costo_unitario: precio ? precio.precio : '' }
          : linea
      )
    );
  }

  async function guardar(evento) {
    evento.preventDefault();
    const compra = await enviar(() =>
      api.crear('/compras', {
        ...ficha,
        proveedor_id: Number(ficha.proveedor_id),
        lineas: lineas.map((linea) => ({
          articulo_id: linea.articulo_id ? Number(linea.articulo_id) : null,
          descripcion: linea.descripcion,
          cantidad: Number(linea.cantidad),
          costo_unitario: linea.articulo_id ? undefined : Number(linea.costo_unitario)
        }))
      })
    );
    if (compra) alGuardar();
  }

  const opcionesArticulo = [
    { valor: '', texto: 'Gasto que no entra a bodega' },
    ...catalogo.map((item) => ({
      valor: item.articulo_id,
      texto: `${item.articulo.nombre} (${item.articulo.unidad})`
    }))
  ];

  return (
    <Ventana titulo="Registrar factura de compra" alCerrar={alCerrar} ancho="max-w-3xl">
      <form onSubmit={guardar} className="space-y-4">
        <Aviso error={error || proveedores.error} />
        <div className="grid gap-3 sm:grid-cols-3">
          <Selector
            etiqueta="Proveedor"
            required
            className="sm:col-span-2"
            value={ficha.proveedor_id}
            onChange={(e) => elegirProveedor(e.target.value)}
            opciones={[
              { valor: '', texto: 'Elige un proveedor' },
              ...(proveedores.datos || [])
                .filter((p) => p.activo)
                .map((p) => ({ valor: p.id, texto: p.nombre }))
            ]}
          />
          <Campo
            etiqueta="Fecha del documento"
            type="date"
            required
            value={ficha.fecha}
            onChange={(e) => setFicha({ ...ficha, fecha: e.target.value })}
          />
          <Selector
            etiqueta="Documento recibido"
            value={ficha.tipo_documento}
            onChange={(e) => setFicha({ ...ficha, tipo_documento: e.target.value })}
            opciones={[
              { valor: 'CCF', texto: 'Crédito fiscal (IVA aparte)' },
              { valor: 'FCF', texto: 'Factura (IVA incluido)' }
            ]}
          />
          <Campo
            etiqueta="Número del documento"
            required
            value={ficha.numero_documento}
            onChange={(e) => setFicha({ ...ficha, numero_documento: e.target.value })}
          />
          <Selector
            etiqueta="Condición"
            value={ficha.condicion}
            onChange={(e) => setFicha({ ...ficha, condicion: e.target.value })}
            opciones={[
              { valor: 'credito', texto: 'Al crédito' },
              { valor: 'contado', texto: 'De contado' }
            ]}
          />
          {ficha.condicion === 'contado' && (
            <Selector
              etiqueta="Se pagó con"
              value={ficha.metodo_pago}
              onChange={(e) => setFicha({ ...ficha, metodo_pago: e.target.value })}
              opciones={METODOS_PAGO}
            />
          )}
        </div>

        <div className="linea-punteada pt-3">
          <p className="font-semibold">Detalle de la factura</p>
          <p className="mb-2 text-xs text-piedra-600">
            {!proveedor
              ? 'Elige primero el proveedor para ver lo que vende.'
              : catalogo.length > 0
                ? 'Solo aparecen los productos de este proveedor, con el precio que él fija.'
                : 'Este proveedor no tiene productos registrados; solo se pueden anotar gastos.'}
          </p>
          <div className="space-y-2">
            {lineas.map((linea, indice) => (
              <div key={indice} className="grid grid-cols-12 items-end gap-2">
                <Selector
                  etiqueta="Artículo"
                  className="col-span-12 sm:col-span-5"
                  value={linea.articulo_id}
                  onChange={(e) => elegirArticulo(indice, e.target.value)}
                  opciones={opcionesArticulo}
                />
                {!linea.articulo_id && (
                  <Campo
                    etiqueta="Descripción del gasto"
                    className="col-span-12 sm:col-span-7"
                    required
                    value={linea.descripcion}
                    onChange={(e) => cambiarLinea(indice, 'descripcion', e.target.value)}
                  />
                )}
                <Campo
                  etiqueta="Cantidad"
                  className="col-span-4 sm:col-span-2"
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                  value={linea.cantidad}
                  onChange={(e) => cambiarLinea(indice, 'cantidad', e.target.value)}
                />
                <Campo
                  etiqueta={linea.articulo_id ? 'Precio fijo' : 'Costo unitario'}
                  className="col-span-4 sm:col-span-2"
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  required
                  readOnly={Boolean(linea.articulo_id)}
                  disabled={Boolean(linea.articulo_id)}
                  title={linea.articulo_id ? 'El precio lo fija el proveedor' : undefined}
                  value={linea.costo_unitario}
                  onChange={(e) => cambiarLinea(indice, 'costo_unitario', e.target.value)}
                />
                <p className="col-span-3 pb-2 text-right text-sm font-semibold sm:col-span-2">
                  {dinero((Number(linea.cantidad) || 0) * (Number(linea.costo_unitario) || 0))}
                </p>
                <button
                  type="button"
                  aria-label="Quitar línea"
                  className="col-span-1 pb-2 font-bold text-cereza disabled:opacity-30"
                  disabled={lineas.length === 1}
                  onClick={() => setLineas(lineas.filter((_, i) => i !== indice))}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-sm font-semibold text-cafe-600"
            onClick={() => setLineas([...lineas, { ...LINEA_VACIA }])}
          >
            Agregar otra línea
          </button>
        </div>

        <div className="ml-auto max-w-xs">
          <Dato nombre="Subtotal" valor={dinero(suma)} />
          <Dato nombre="IVA 13 %" valor={dinero(iva)} />
          <Dato nombre="Total de la factura" valor={dinero(suma + iva)} fuerte />
        </div>
        <div className="flex justify-end">
          <Boton type="submit" disabled={enviando}>
            Registrar compra
          </Boton>
        </div>
      </form>
    </Ventana>
  );
}

function DetalleCompra({ id, alCerrar, alCambiar }) {
  const { datos: compra, cargando, error, recargar } = useConsulta(`/compras/${id}`);
  const pago = useEnvio();
  const [abono, setAbono] = useState({
    monto: '',
    metodo: 'transferencia',
    referencia: '',
    fecha: hoyIso()
  });

  async function pagar(evento) {
    evento.preventDefault();
    const respuesta = await pago.enviar(() =>
      api.crear(`/compras/${id}/pagos`, { ...abono, monto: Number(abono.monto) })
    );
    if (respuesta) {
      setAbono({ ...abono, monto: '', referencia: '' });
      recargar();
      alCambiar();
    }
  }

  return (
    <Ventana titulo="Factura de compra" alCerrar={alCerrar} ancho="max-w-2xl">
      {cargando && !compra && <Cargando />}
      <Aviso error={error} />
      {compra && (
        <div className="space-y-4">
          <div className="text-sm">
            <p className="text-lg font-bold">{compra.proveedor.nombre}</p>
            <p className="text-piedra-600">
              {`${compra.tipo_documento} ${compra.numero_documento}, ${fecha(compra.fecha)}. ` +
                `Recibida en ${compra.sucursal.nombre} por ${compra.usuario.nombre}.`}
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {compra.lineas.map((linea) => (
                <tr key={linea.id} className="border-b border-piedra-100">
                  <td className="py-1.5">
                    {linea.descripcion}{' '}
                    <Etiqueta tono={linea.clase === 'costo' ? 'cafe' : 'neutro'}>
                      {linea.clase === 'costo' ? 'Inventario' : 'Gasto'}
                    </Etiqueta>
                  </td>
                  <td className="py-1.5 text-right">
                    {linea.cantidad} × {dinero(linea.costo_unitario)}
                  </td>
                  <td className="w-24 py-1.5 text-right font-semibold">{dinero(linea.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="ml-auto max-w-xs">
            <Dato nombre="Subtotal" valor={dinero(compra.subtotal)} />
            <Dato nombre="IVA" valor={dinero(compra.iva)} />
            <Dato nombre="Total" valor={dinero(compra.total)} />
            <Dato nombre="Saldo pendiente" valor={dinero(compra.saldo)} fuerte />
          </div>

          {compra.pagos.length > 0 && (
            <div className="linea-punteada pt-3 text-sm">
              <p className="mb-1 font-semibold">Pagos realizados</p>
              {compra.pagos.map((item) => (
                <p key={item.id} className="flex justify-between">
                  <span>
                    {fecha(item.fecha)}, {item.metodo}
                    {item.referencia ? ` ${item.referencia}` : ''}
                  </span>
                  <span>{dinero(item.monto)}</span>
                </p>
              ))}
            </div>
          )}

          {compra.estado === 'pendiente' && (
            <form onSubmit={pagar} className="linea-punteada space-y-3 pt-3">
              <p className="font-semibold">Registrar pago al proveedor</p>
              <Aviso error={pago.error} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Campo
                  etiqueta="Monto"
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={compra.saldo}
                  required
                  value={abono.monto}
                  onChange={(e) => setAbono({ ...abono, monto: e.target.value })}
                />
                <Selector
                  etiqueta="Método"
                  value={abono.metodo}
                  onChange={(e) => setAbono({ ...abono, metodo: e.target.value })}
                  opciones={METODOS_PAGO}
                />
                <Campo
                  etiqueta="Fecha"
                  type="date"
                  value={abono.fecha}
                  onChange={(e) => setAbono({ ...abono, fecha: e.target.value })}
                />
                <Campo
                  etiqueta="Referencia"
                  value={abono.referencia}
                  onChange={(e) => setAbono({ ...abono, referencia: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Boton
                  variante="secundario"
                  onClick={() => setAbono({ ...abono, monto: String(compra.saldo) })}
                >
                  Pagar el saldo completo
                </Boton>
                <Boton type="submit" disabled={pago.enviando}>
                  Registrar pago
                </Boton>
              </div>
            </form>
          )}
        </div>
      )}
    </Ventana>
  );
}

function ListaCompras({ alVer }) {
  const { datos, cargando, error } = useConsulta('/compras');
  const resumen = useConsulta('/compras/resumen');

  const columnas = [
    { titulo: 'Fecha', celda: (c) => fecha(c.fecha) },
    {
      titulo: 'Proveedor',
      celda: (c) => <span className="font-semibold">{c.proveedor.nombre}</span>
    },
    { titulo: 'Documento', celda: (c) => `${c.tipo_documento} ${c.numero_documento}` },
    { titulo: 'Condición', celda: (c) => (c.condicion === 'credito' ? 'Crédito' : 'Contado') },
    {
      titulo: 'Estado',
      celda: (c) =>
        c.estado === 'pagada' ? (
          <Etiqueta tono="bien">Pagada</Etiqueta>
        ) : (
          <Etiqueta tono="alerta">Debe {dinero(c.saldo)}</Etiqueta>
        )
    },
    { titulo: 'Total', derecha: true, celda: (c) => dinero(c.total) }
  ];

  return (
    <>
      {resumen.datos && (
        <p className="mb-4 text-sm text-piedra-600">
          En lo que va del mes se compraron{' '}
          <strong className="text-tinta">{dinero(resumen.datos.costo)}</strong> en insumos para
          inventario y <strong className="text-tinta">{dinero(resumen.datos.gasto)}</strong> en
          gastos de operación, sin IVA.
        </p>
      )}
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla
          columnas={columnas}
          filas={datos || []}
          alElegir={(c) => alVer(c.id)}
          vacio="Aún no hay compras registradas"
        />
      )}
    </>
  );
}

function PorPagar({ alVer }) {
  const { datos, cargando, error } = useConsulta('/cuentas-por-pagar');
  if (cargando) return <Cargando />;
  if (error) return <Aviso error={error} />;

  const columnas = [
    { titulo: 'Proveedor', celda: (d) => <span className="font-semibold">{d.proveedor}</span> },
    { titulo: 'Documento', celda: (d) => d.documento },
    { titulo: 'Vence', celda: (d) => fecha(d.vencimiento) },
    {
      titulo: 'Plazo',
      celda: (d) =>
        d.vencida ? (
          <Etiqueta tono="mal">Venció hace {Math.abs(d.dias_para_vencer)} días</Etiqueta>
        ) : (
          <Etiqueta tono={d.dias_para_vencer <= 7 ? 'alerta' : 'neutro'}>
            Faltan {d.dias_para_vencer} días
          </Etiqueta>
        )
    },
    {
      titulo: 'Saldo',
      derecha: true,
      celda: (d) => <span className="font-semibold">{dinero(d.saldo)}</span>
    }
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
      <Panel titulo="Deuda con proveedores">
        <p className="text-4xl font-semibold">{dinero(datos.total)}</p>
        <p
          className={`mt-1 text-sm font-semibold ${
            datos.vencido > 0 ? 'text-cereza' : 'text-hoja'
          }`}
        >
          {datos.vencido > 0 ? `${dinero(datos.vencido)} ya vencieron` : 'Nada vencido'}
        </p>
        <ul className="linea-punteada mt-3 space-y-1.5 pt-3 text-sm">
          {datos.por_proveedor.map((fila) => (
            <li key={fila.proveedor} className="flex justify-between gap-3">
              <span>{fila.proveedor}</span>
              <span className="font-semibold">{dinero(fila.saldo)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Tabla
        columnas={columnas}
        filas={datos.documentos}
        alElegir={(d) => alVer(d.id)}
        vacio="No hay facturas pendientes de pago"
      />
    </div>
  );
}

function Proveedores() {
  const { datos, cargando, error, recargar } = useConsulta('/proveedores');
  const guardado = useEnvio();
  const [ficha, setFicha] = useState(null);

  async function guardar(evento) {
    evento.preventDefault();
    const cuerpo = { ...ficha, dias_credito: Number(ficha.dias_credito) || 0 };
    const respuesta = await guardado.enviar(() =>
      ficha.id
        ? api.actualizar(`/proveedores/${ficha.id}`, cuerpo)
        : api.crear('/proveedores', cuerpo)
    );
    if (respuesta) {
      setFicha(null);
      recargar();
    }
  }

  const columnas = [
    { titulo: 'Proveedor', celda: (p) => <span className="font-semibold">{p.nombre}</span> },
    { titulo: 'NIT', celda: (p) => p.nit },
    { titulo: 'NRC', celda: (p) => p.nrc },
    { titulo: 'Contacto', celda: (p) => `${p.contacto || ''} ${p.telefono || ''}` },
    { titulo: 'Productos', derecha: true, celda: (p) => p.catalogo.length },
    {
      titulo: 'Crédito',
      derecha: true,
      celda: (p) => (p.dias_credito > 0 ? `${p.dias_credito} días` : 'Contado')
    }
  ];
  const campo = (nombre) => ({
    value: ficha[nombre] ?? '',
    onChange: (e) => setFicha({ ...ficha, [nombre]: e.target.value })
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Boton onClick={() => setFicha({ nombre: '', dias_credito: 30 })}>Agregar proveedor</Boton>
      </div>
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla
          columnas={columnas}
          filas={datos || []}
          alElegir={setFicha}
          vacio="Aún no hay proveedores"
        />
      )}
      {ficha && (
        <Ventana
          titulo={ficha.id ? 'Editar proveedor' : 'Proveedor nuevo'}
          alCerrar={() => setFicha(null)}
        >
          <form onSubmit={guardar} className="space-y-3">
            <Aviso error={guardado.error} />
            <Campo etiqueta="Nombre o razón social" required {...campo('nombre')} />
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="NIT" {...campo('nit')} />
              <Campo etiqueta="NRC" {...campo('nrc')} />
              <Campo etiqueta="Persona de contacto" {...campo('contacto')} />
              <Campo etiqueta="Teléfono" {...campo('telefono')} />
              <Campo etiqueta="Correo" type="email" {...campo('correo')} />
              <Campo etiqueta="Días de crédito" type="number" min="0" {...campo('dias_credito')} />
            </div>
            {ficha.id && (
              <div className="linea-punteada pt-3">
                <p className="font-semibold">Lo que vende</p>
                <p className="mb-2 text-xs text-piedra-600">
                  Los precios los fija el proveedor y no se cambian desde aquí.
                </p>
                {ficha.catalogo.length === 0 ? (
                  <p className="text-sm text-piedra-600">No tiene productos registrados.</p>
                ) : (
                  <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {ficha.catalogo.map((item) => (
                      <li key={item.id} className="flex justify-between gap-3">
                        <span>{item.articulo.nombre}</span>
                        <span className="font-semibold">
                          ${Number(item.precio).toFixed(4)} por {item.articulo.unidad}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Boton type="submit" disabled={guardado.enviando}>
              Guardar proveedor
            </Boton>
          </form>
        </Ventana>
      )}
    </>
  );
}

export default function Compras() {
  const [pestana, setPestana] = useState('compras');
  const [creando, setCreando] = useState(false);
  const [viendo, setViendo] = useState(null);
  const [version, setVersion] = useState(0);

  return (
    <div>
      <Encabezado
        titulo="Compras y proveedores"
        detalle="Cada factura suma a bodega y, si es al crédito, queda como cuenta por pagar."
      >
        <Boton onClick={() => setCreando(true)}>Registrar compra</Boton>
      </Encabezado>
      <Pestanas
        activa={pestana}
        alCambiar={setPestana}
        opciones={[
          { valor: 'compras', texto: 'Facturas de compra' },
          { valor: 'pagar', texto: 'Cuentas por pagar' },
          { valor: 'proveedores', texto: 'Proveedores' }
        ]}
      />
      {pestana === 'compras' && <ListaCompras key={version} alVer={setViendo} />}
      {pestana === 'pagar' && <PorPagar key={version} alVer={setViendo} />}
      {pestana === 'proveedores' && <Proveedores />}
      {creando && (
        <CompraNueva
          alCerrar={() => setCreando(false)}
          alGuardar={() => {
            setCreando(false);
            setVersion(version + 1);
          }}
        />
      )}
      {viendo && (
        <DetalleCompra
          id={viendo}
          alCerrar={() => setViendo(null)}
          alCambiar={() => setVersion(version + 1)}
        />
      )}
    </div>
  );
}
