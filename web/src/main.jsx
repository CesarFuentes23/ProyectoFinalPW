import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ProveedorSesion } from './contexto/Sesion.jsx';
import { activarValidacionEnEspanol } from './utilidades/validacion.js';
import './estilos.css';

activarValidacionEnEspanol();

createRoot(document.getElementById('raiz')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </BrowserRouter>
  </React.StrictMode>
);
