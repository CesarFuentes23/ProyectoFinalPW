import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { almacen } from '../api/cliente.js';

const SesionContexto = createContext(null);

export function ProveedorSesion({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarSesion = useCallback(async () => {
    if (!almacen.token()) {
      setCargando(false);
      return;
    }
    try {
      const [actual, lista] = await Promise.all([
        api.obtener('/sesiones/actual'),
        api.obtener('/sucursales')
      ]);
      const guardada = Number(almacen.sucursal());
      const elegida =
        actual.rol === 'administrador' && lista.some((s) => s.id === guardada)
          ? guardada
          : actual.sucursal_id;
      almacen.guardarSucursal(elegida);
      setUsuario(actual);
      setSucursales(lista);
      setSucursalId(elegida);
    } catch (error) {
      almacen.limpiar();
      setUsuario(null);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  const salir = useCallback(() => {
    almacen.limpiar();
    setUsuario(null);
    setSucursalId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('sesion-vencida', salir);
    return () => window.removeEventListener('sesion-vencida', salir);
  }, [salir]);

  const ingresar = useCallback(
    async (correo, clave) => {
      const respuesta = await api.crear('/sesiones', { correo, clave });
      almacen.guardarToken(respuesta.token);
      almacen.guardarSucursal(respuesta.usuario.sucursal_id);
      setCargando(true);
      await cargarSesion();
    },
    [cargarSesion]
  );

  const cambiarSucursal = useCallback((id) => {
    almacen.guardarSucursal(id);
    setSucursalId(Number(id));
  }, []);

  const valor = useMemo(() => {
    const sucursal = sucursales.find((s) => s.id === sucursalId) || null;
    const esJefatura = usuario ? ['administrador', 'gerente'].includes(usuario.rol) : false;
    return {
      usuario,
      sucursales,
      sucursal,
      sucursalId,
      cargando,
      esJefatura,
      ingresar,
      salir,
      cambiarSucursal,
      recargarSucursales: cargarSesion
    };
  }, [usuario, sucursales, sucursalId, cargando, ingresar, salir, cambiarSucursal, cargarSesion]);

  return <SesionContexto.Provider value={valor}>{children}</SesionContexto.Provider>;
}

export function useSesion() {
  return useContext(SesionContexto);
}
