import { useCallback, useEffect, useState } from 'react';
import api from '../api/cliente.js';
import { useSesion } from '../contexto/Sesion.jsx';
export default function useConsulta(ruta, parametros = {}) {
const { sucursalId } = useSesion();
const [datos, setDatos] = useState(null);
const [cargando, setCargando] = useState(true);
const [error, setError] = useState(null);
const firma = JSON.stringify(parametros);
const cargar = useCallback(async () => {
if (!ruta) return;
setCargando(true);
setError(null);
try {
setDatos(await api.obtener(ruta, JSON.parse(firma)));
} catch (fallo) {
setError(fallo);
} finally {
setCargando(false);
}
}, [ruta, firma]);
useEffect(() => {
cargar();
}, [cargar, sucursalId]);
return { datos, cargando, error, recargar: cargar };
}