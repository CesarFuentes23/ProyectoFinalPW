import { useEffect } from 'react';
const BASE_BOTON =
'inline-flex items-center justify-center gap-2 rounded-lg font-bold transition ' +
'active:translate-x-px active:translate-y-px active:shadow-none ' +
'disabled:cursor-not-allowed disabled:opacity-45';
const PESTANA_NORMAL = 'border-transparent text-piedra-600 hover:text-tinta';
const FONDO_VENTANA =
'fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8';
const CAJA_VENTANA = 'rounded-xl border-2 border-tinta bg-white p-5 shadow-sello sm:p-6';
const ESTILO_BOTON = {
primario: 'border-2 border-tinta bg-cafe-800 text-white shadow-sello hover:bg-cafe-600',
secundario: 'border-2 border-tinta bg-white text-tinta hover:bg-maiz-100',
peligro: 'border-2 border-cereza bg-white text-cereza hover:bg-cereza-100',
texto: 'text-cafe-600 hover:bg-cafe-50'
};
export function Boton({
variante = 'primario',
grande = false,
className = '',
children,
...resto
}) {
const medida = grande ? 'px-5 py-3 text-base' : 'px-3.5 py-2 text-sm';
return (
<button
type="button"
className={`${BASE_BOTON} ${medida} ${ESTILO_BOTON[variante]} ${className}`}
{...resto}
>
{children}
</button>
);
}
const ESTILO_CONTROL =
'w-full rounded-lg border-2 border-piedra-200 bg-white px-3 py-2 text-sm ' +
'placeholder:text-piedra-400 focus:border-cafe-600 focus:outline-none disabled:bg-piedra-100';

export function Campo({ etiqueta, ayuda, className = '', children, ...resto }) {
return (
<label className={`block ${className}`}>
<span className="mb-1 block text-sm font-bold text-cafe-800">{etiqueta}</span>
{children || <input className={ESTILO_CONTROL} {...resto} />}
{ayuda && <span className="mt-1 block text-xs text-piedra-400">{ayuda}</span>}
</label>
);
}
export function Selector({ etiqueta, opciones, className = '', ...resto }) {
return (
<Campo etiqueta={etiqueta} className={className}>
<select className={ESTILO_CONTROL} {...resto}>
{opciones.map((opcion) => (
<option key={opcion.valor} value={opcion.valor}>
{opcion.texto}
</option>
))}
</select>
</Campo>
);
}
const ESTILO_ETIQUETA = {
neutro: 'bg-piedra-100 text-piedra-600',
cafe: 'bg-cafe-100 text-cafe-800',
bien: 'bg-hoja-100 text-hoja',
alerta: 'bg-maiz-100 text-maiz-700',
mal: 'bg-cereza-100 text-cereza'
};
export function Etiqueta({ tono = 'neutro', children }) {
return (
<span
className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold ${
ESTILO_ETIQUETA[tono]
}`}
>
{children}
</span>
);
}
export function Aviso({ error, children, tono = 'mal' }) {
if (!error && !children) return null;
const faltantes = error?.detalle?.faltantes;
const colores =
tono === 'mal'
? 'border-cereza/30 bg-cereza-100 text-cereza'
: 'border-maiz/40 bg-maiz-100 text-maiz-700';
return (
<div role="alert" className={`rounded-lg border-2 px-3.5 py-2.5 text-sm ${colores}`}>
<p className="font-semibold">{error ? error.message : children}</p>
{Array.isArray(faltantes) && typeof faltantes[0] === 'object' && (
<ul className="mt-1 list-disc pl-5">
{faltantes.map((faltante) => (
<li key={faltante.articulo}>
{faltante.articulo}: se necesitan {faltante.requerido} {faltante.unidad} y hay{' '}
{faltante.disponible}
</li>
))}
</ul>
)}

</div>
);
}
export function Cargando({ texto = 'Cargando' }) {
return (
<p className="py-10 text-center text-sm text-piedra-400" aria-live="polite">
{texto}…
</p>
);
}
export function Vacio({ titulo, children }) {
return (
<div className="rounded-xl border-2 border-dashed border-piedra-200 px-6 py-10 text-center">
<p className="font-titulo text-xl font-bold text-cafe-800">{titulo}</p>
{children && <p className="mx-auto mt-1 max-w-md text-sm text-piedra-600">{children}</p>}
</div>
);
}
export function Encabezado({ titulo, detalle, children }) {
return (
<header className="mb-6 flex flex-wrap items-end justify-between gap-3">
<div>
<h1 className="text-3xl text-cafe-900">{titulo}</h1>
<div className="franja mt-1 w-[128px]" aria-hidden="true" />
{detalle && <p className="mt-2 text-sm text-piedra-600">{detalle}</p>}
</div>
{children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
</header>
);
}
export function Pestanas({ opciones, activa, alCambiar }) {
return (
<div role="tablist" className="mb-5 flex gap-1 border-b border-piedra-200">
{opciones.map((opcion) => (
<button
key={opcion.valor}
role="tab"
type="button"
aria-selected={activa === opcion.valor}
onClick={() => alCambiar(opcion.valor)}
className={`-mb-px border-b-4 px-3.5 py-2 text-sm font-bold ${
activa === opcion.valor ? 'border-maiz text-tinta' : PESTANA_NORMAL
}`}
>
{opcion.texto}
</button>
))}
</div>
);
}
export function Ventana({ titulo, alCerrar, ancho = 'max-w-lg', children }) {
useEffect(() => {
const alPresionar = (evento) => {
if (evento.key === 'Escape') alCerrar();
};
window.addEventListener('keydown', alPresionar);
return () => window.removeEventListener('keydown', alPresionar);
}, [alCerrar]);
return (
<div className={FONDO_VENTANA} onMouseDown={alCerrar}>
<section
role="dialog"
aria-modal="true"
aria-label={titulo}
className={`w-full ${ancho} ${CAJA_VENTANA}`}
onMouseDown={(evento) => evento.stopPropagation()}
>
<div className="no-imprimir mb-4 flex items-start justify-between gap-4">
<h2 className="text-2xl text-cafe-900">{titulo}</h2>
<button
type="button"
onClick={alCerrar}
className="rounded px-2 py-1 text-sm font-semibold text-piedra-600 hover:bg-piedra-100"
>
Cerrar
</button>
</div>
{children}
</section>
</div>
);
}
export function Tabla({ columnas, filas, llave = 'id', alElegir, vacio = 'No hay registros' }) {
if (filas.length === 0) return <Vacio titulo={vacio} />;
return (
<div className="overflow-x-auto rounded-xl border border-piedra-200 bg-white">
<table className="w-full text-sm">
<thead>
<tr className="border-b border-piedra-200 bg-cafe-50 text-left text-cafe-800">
{columnas.map((columna) => (
<th
key={columna.titulo}
scope="col"
className={`px-3.5 py-2.5 font-bold ${columna.derecha ? 'text-right' : ''}`}
>
{columna.titulo}
</th>
))}
</tr>
</thead>
<tbody>
{filas.map((fila) => (
<tr
key={fila[llave]}
onClick={alElegir ? () => alElegir(fila) : undefined}
className={`border-b border-piedra-100 last:border-0 ${
alElegir ? 'cursor-pointer hover:bg-maiz-100' : ''
}`}
>
{columnas.map((columna) => (
<td
key={columna.titulo}
className={`px-3.5 py-2.5 align-middle ${columna.derecha ? 'text-right' : ''}`}
>
{columna.celda(fila)}
</td>
))}
</tr>
))}
</tbody>
</table>
</div>
);

}
export function Panel({ titulo, accion, className = '', children }) {
return (
<section className={`rounded-xl border border-piedra-200 bg-white p-4 sm:p-5 ${className}`}>
{(titulo || accion) && (
<div className="mb-3 flex items-center justify-between gap-3">
<h2 className="text-xl text-cafe-900">{titulo}</h2>
{accion}
</div>
)}
{children}
</section>
);
}
export function Dato({ nombre, valor, fuerte = false }) {
return (
<div className="flex items-baseline justify-between gap-4 py-1 text-sm">
<span className="text-piedra-600">{nombre}</span>
<span className={fuerte ? 'font-titulo text-xl font-bold' : 'font-semibold'}>{valor}</span>
</div>
);
}
