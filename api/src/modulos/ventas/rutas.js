// api/src/modulos/ventas/rutas.js
// pendiente: lo sube quien tiene este módulo
import { Router } from 'express';
import { permitir } from '../../intermedios/autenticar.js';
import * as controlador from './controlador.js';
const rutas = Router();
const vendedores = permitir('administrador', 'gerente', 'cajero', 'barista');
rutas.get('/ventas', controlador.listarVentas);
rutas.post('/ventas', vendedores, controlador.crearVenta);
rutas.get('/ventas/:id', controlador.obtenerVenta);
rutas.post('/ventas/:id/anulacion', permitir('administrador', 'gerente'), controlador.anularVenta);
rutas.get('/clientes', controlador.listarClientes);
rutas.post('/clientes', vendedores, controlador.crearCliente);
rutas.put('/clientes/:id', vendedores, controlador.actualizarCliente);
export default rutas;
