import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSesion } from '../contexto/Sesion.jsx';
import { NOMBRE_ROL } from '../utilidades/formato.js';

const BARRA_MOVIL =
  'no-imprimir flex items-center justify-between border-b-4 border-maiz bg-cafe-950 px-4 py-3 ' +
  'text-white lg:hidden';
const MENU_LATERAL =
  'bg-cafe-950 text-cafe-100 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 ' +
  'lg:flex-col';
const SELECTOR_SUCURSAL =
  'mt-1 w-full rounded-md border-2 border-white/20 bg-cafe-900 px-2 py-1.5 text-sm font-bold ' +
  'text-white';
const ENLACE = 'block rounded-lg px-3 py-1.5 text-[0.95rem]';
const ENLACE_ACTIVO = 'bg-maiz font-bold text-tinta shadow-[2px_2px_0_#000]';
const ENLACE_NORMAL = 'text-cafe-100 hover:bg-white/10';
const BOTON_SALIR =
  'mt-2 rounded-lg border-2 border-white/40 px-3 py-1 text-xs font-bold text-white ' +
  'hover:border-cereza hover:bg-cereza';

const SECCIONES = [
  {
    nombre: 'Mostrador',
    enlaces: [
      { a: '/vender', texto: 'Vender' },
      { a: '/caja', texto: 'Caja' },
      { a: '/ventas', texto: 'Documentos emitidos' }
    ]
  },
  {
    nombre: 'Bodega',
    enlaces: [
      { a: '/inventario', texto: 'Existencias' },
      { a: '/menu', texto: 'Menú y recetas', jefatura: true },
      { a: '/compras', texto: 'Compras y proveedores', jefatura: true }
    ]
  },
  {
    nombre: 'Equipo',
    jefatura: true,
    enlaces: [
      { a: '/empleados', texto: 'Empleados' },
      { a: '/planilla', texto: 'Planilla quincenal' }
    ]
  },
  {
    nombre: 'Negocio',
    jefatura: true,
    enlaces: [
      { a: '/resumen', texto: 'Resumen del día' },
      { a: '/ajustes', texto: 'Sucursales y usuarios', soloAdmin: true }
    ]
  }
];

export default function Marco() {
  const { usuario, sucursal, sucursales, esJefatura, cambiarSucursal, salir } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const esAdmin = usuario.rol === 'administrador';

  const visibles = SECCIONES.filter((seccion) => !seccion.jefatura || esJefatura).map(
    (seccion) => ({
      ...seccion,
      enlaces: seccion.enlaces.filter(
        (enlace) => (!enlace.jefatura || esJefatura) && (!enlace.soloAdmin || esAdmin)
      )
    })
  );

  return (
    <div className="min-h-screen lg:flex">
      <div className={BARRA_MOVIL}>
        <span className="flex items-center gap-2 font-titulo text-xl font-bold">
          <img src="/marca.svg" alt="" className="h-7 w-7" />
          Orígenes SV
        </span>
        <button
          type="button"
          className="rounded-lg border-2 border-white/40 px-3 py-1 text-sm font-bold"
          aria-expanded={abierto}
          onClick={() => setAbierto(!abierto)}
        >
          Menú
        </button>
      </div>

      <aside className={`no-imprimir ${abierto ? 'block' : 'hidden'} ${MENU_LATERAL}`}>
        <div className="hidden px-5 pb-4 pt-5 lg:block">
          <div className="flex items-center gap-3">
            <img src="/marca.svg" alt="" className="h-11 w-11 -rotate-6" />
            <div>
              <p className="font-titulo text-2xl font-bold leading-none text-white">Orígenes SV</p>
              <p className="mt-1 text-xs text-cafe-400">Cocina y café salvadoreño</p>
            </div>
          </div>
        </div>
        <div className="franja hidden lg:block" aria-hidden="true" />

        <div className="px-5 py-3">
          {esAdmin ? (
            <label className="block text-xs font-bold text-cafe-400">
              Sucursal que estás viendo
              <select
                className={SELECTOR_SUCURSAL}
                value={sucursal?.id || ''}
                onChange={(evento) => cambiarSucursal(evento.target.value)}
              >
                {sucursales.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="font-titulo text-lg font-bold text-maiz">Sucursal {sucursal?.nombre}</p>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Módulos">
          {visibles.map((seccion) => (
            <div key={seccion.nombre} className="mt-4">
              <p className="px-2 text-xs font-bold text-cafe-400">{seccion.nombre}</p>
              <ul className="mt-1">
                {seccion.enlaces.map((enlace) => (
                  <li key={enlace.a}>
                    <NavLink
                      to={enlace.a}
                      onClick={() => setAbierto(false)}
                      className={({ isActive }) =>
                        `${ENLACE} ${isActive ? ENLACE_ACTIVO : ENLACE_NORMAL}`
                      }
                    >
                      {enlace.texto}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-5 py-4 text-sm">
          <p className="font-bold text-white">{usuario.nombre}</p>
          <p className="text-xs text-cafe-400">{NOMBRE_ROL[usuario.rol]}</p>
          <button type="button" onClick={salir} className={BOTON_SALIR}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
}
