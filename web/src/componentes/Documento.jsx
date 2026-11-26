import { dinero, fechaHora, NOMBRE_DOCUMENTO, NOMBRE_METODO } from '../utilidades/formato.js';

export default function Documento({ venta }) {
  const esCredito = venta.tipo_documento === 'CCF';
  return (
    <article className="tiquete imprimible mx-auto w-full max-w-sm px-5 pt-5 text-sm">
      <header className="text-center">
        <p className="text-2xl font-bold">Orígenes</p>
        <p className="text-xs text-piedra-600">Sucursal {venta.sucursal?.nombre}</p>
        <p className="text-xs text-piedra-600">{venta.sucursal?.direccion}</p>
      </header>

      <div className="linea-punteada mt-3 pt-3">
        <p className="font-semibold">{NOMBRE_DOCUMENTO[venta.tipo_documento]}</p>
        <p>N.º {venta.numero}</p>
        <p className="text-piedra-600">{fechaHora(venta.fecha)}</p>
        <p className="text-piedra-600">Atendió {venta.usuario?.nombre}</p>
        {venta.estado === 'anulada' && (
          <p className="mt-1 font-bold text-cereza">Documento anulado: {venta.motivo_anulacion}</p>
        )}
      </div>

      {venta.cliente && (
        <div className="linea-punteada mt-3 pt-3">
          <p className="font-semibold">{venta.cliente.nombre}</p>
          {venta.cliente.nit && <p>NIT {venta.cliente.nit}</p>}
          {venta.cliente.nrc && <p>NRC {venta.cliente.nrc}</p>}
          {venta.cliente.giro && <p className="text-piedra-600">{venta.cliente.giro}</p>}
        </div>
      )}

      <table className="linea-punteada mt-3 w-full pt-3">
        <tbody>
          {venta.lineas.map((linea) => (
            <tr key={linea.id} className="align-top">
              <td className="py-1 pr-2">{linea.cantidad}</td>
              <td className="py-1">
                {linea.descripcion}
                <span className="block text-xs text-piedra-600">
                  {dinero(linea.precio_unitario)} c/u
                </span>
              </td>
              <td className="py-1 text-right">{dinero(linea.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="linea-punteada mt-3 space-y-1 pt-3">
        <div className="flex justify-between">
          <dt>{esCredito ? 'Ventas gravadas' : 'Subtotal sin IVA'}</dt>
          <dd>{dinero(venta.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>IVA 13 %</dt>
          <dd>{dinero(venta.iva)}</dd>
        </div>
        <div className="flex justify-between text-xl font-bold">
          <dt>Total</dt>
          <dd>{dinero(venta.total)}</dd>
        </div>
      </dl>

      <dl className="linea-punteada mt-3 space-y-1 pt-3">
        {venta.pagos.map((pago) => (
          <div key={pago.id} className="flex justify-between">
            <dt>
              {NOMBRE_METODO[pago.metodo]}
              {pago.referencia ? ` (${pago.referencia})` : ''}
            </dt>
            <dd>{dinero(pago.monto)}</dd>
          </div>
        ))}
        {venta.cambio > 0 && (
          <div className="flex justify-between text-piedra-600">
            <dt>Recibido {dinero(venta.efectivo_recibido)}, cambio</dt>
            <dd>{dinero(venta.cambio)}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
