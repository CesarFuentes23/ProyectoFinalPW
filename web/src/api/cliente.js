const BASE = import.meta.env.VITE_API_URL || '/api/v1';
const LLAVE_TOKEN = 'origenes.token';
const LLAVE_SUCURSAL = 'origenes.sucursal';

export class ErrorServidor extends Error {
  constructor(mensaje, estado, detalle) {
    super(mensaje);
    this.estado = estado;
    this.detalle = detalle;
  }
}

export const almacen = {
  token: () => localStorage.getItem(LLAVE_TOKEN),
  guardarToken: (token) => localStorage.setItem(LLAVE_TOKEN, token),
  sucursal: () => localStorage.getItem(LLAVE_SUCURSAL),
  guardarSucursal: (id) => localStorage.setItem(LLAVE_SUCURSAL, String(id)),
  limpiar: () => {
    localStorage.removeItem(LLAVE_TOKEN);
    localStorage.removeItem(LLAVE_SUCURSAL);
  }
};

function armarUrl(ruta, parametros = {}) {
  const consulta = new URLSearchParams();
  const sucursal = almacen.sucursal();
  if (sucursal) consulta.set('sucursal_id', sucursal);
  Object.entries(parametros).forEach(([llave, valor]) => {
    if (valor !== undefined && valor !== null && valor !== '') consulta.set(llave, valor);
  });
  const texto = consulta.toString();
  return `${BASE}${ruta}${texto ? `?${texto}` : ''}`;
}

async function pedir(metodo, ruta, { cuerpo, parametros } = {}) {
  const cabeceras = { Accept: 'application/json' };
  const token = almacen.token();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(armarUrl(ruta, parametros), {
      method: metodo,
      headers: cabeceras,
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined
    });
  } catch (error) {
    throw new ErrorServidor(
      'No hay conexión con el servidor. Revisa que la API esté encendida.',
      0,
      null
    );
  }

  if (respuesta.status === 204) return null;

  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      almacen.limpiar();
      window.dispatchEvent(new Event('sesion-vencida'));
    }
    throw new ErrorServidor(
      datos?.mensaje || 'El servidor no pudo completar la solicitud',
      respuesta.status,
      datos?.detalle
    );
  }
  return datos;
}

const api = {
  obtener: (ruta, parametros) => pedir('GET', ruta, { parametros }),
  crear: (ruta, cuerpo) => pedir('POST', ruta, { cuerpo }),
  actualizar: (ruta, cuerpo) => pedir('PUT', ruta, { cuerpo }),
  eliminar: (ruta) => pedir('DELETE', ruta)
};

export default api;
