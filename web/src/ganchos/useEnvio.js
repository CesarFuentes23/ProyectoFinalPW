import { useState } from 'react';

export default function useEnvio() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar(accion) {
    setEnviando(true);
    setError(null);
    try {
      return await accion();
    } catch (fallo) {
      setError(fallo);
      return null;
    } finally {
      setEnviando(false);
    }
  }

  return { enviando, error, enviar, limpiarError: () => setError(null) };
}
