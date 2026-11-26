import { useState } from 'react';
import { useSesion } from '../contexto/Sesion.jsx';
import useEnvio from '../ganchos/useEnvio.js';
import { Aviso, Boton, Campo } from '../componentes/ui.jsx';
const DIBUJO =
'relative min-h-60 overflow-hidden border-b-4 border-tinta bg-laguna ' +
'lg:border-b-0 lg:border-r-4';
const LETRERO =
'relative m-6 inline-flex items-center gap-3 rounded-xl border-2 border-tinta ' +
'bg-white px-4 py-3 shadow-sello sm:m-10';
const TARJETA = 'overflow-hidden rounded-xl border-2 border-tinta bg-white shadow-sello';
export default function Ingreso() {
const { ingresar } = useSesion();
const { enviando, error, enviar } = useEnvio();
const [correo, setCorreo] = useState('');
const [clave, setClave] = useState('');
function alEnviar(evento) {
evento.preventDefault();
enviar(() => ingresar(correo, clave));
}
return (
<div className="grid min-h-screen lg:grid-cols-2">
<section className={DIBUJO}>
<img
src="/paisaje.svg"
alt=""
className="absolute inset-0 h-full w-full object-cover object-bottom"
/>
<div className={LETRERO}>
<img src="/marca.svg" alt="" className="h-12 w-12 -rotate-6" />
<div>
<p className="font-titulo text-3xl font-bold leading-none text-cafe-900">Orígenes SV</p>
<p className="mt-1 text-sm text-piedra-600">Cocina y café salvadoreño</p>
</div>

</div>
</section>
<section className="flex items-center justify-center px-6 py-10">
<div className="w-full max-w-sm">
<form onSubmit={alEnviar} className={TARJETA}>
<div className="franja" aria-hidden="true" />
<div className="space-y-4 p-6">
<div>
<h1 className="text-3xl text-cafe-900">Iniciar sesión</h1>
<p className="text-sm text-piedra-600">
Entra con el correo y la contraseña que te dio la administración.
</p>
</div>
<Aviso error={error} />
<Campo
etiqueta="Correo"
type="email"
autoComplete="username"
placeholder="usuario@origenes.sv"
required
value={correo}
onChange={(e) => setCorreo(e.target.value)}
/>
<Campo
etiqueta="Contraseña"
type="password"
autoComplete="current-password"
required
value={clave}
onChange={(e) => setClave(e.target.value)}
/>
<Boton type="submit" grande className="w-full" disabled={enviando}>
{enviando ? 'Ingresando…' : 'Ingresar'}
</Boton>
</div>
</form>
<p className="mt-5 text-center text-sm text-piedra-600">
Si olvidaste tu contraseña, pide a la administración que la restablezca.
</p>
</div>
</section>
</div>
);
}

