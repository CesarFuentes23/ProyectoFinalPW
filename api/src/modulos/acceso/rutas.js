import { Router } from 'express';
import { autenticar } from '../../intermedios/autenticar.js';
import { iniciarSesion, sesionActual } from './controlador.js';
const rutas = Router();
rutas.post('/sesiones', iniciarSesion);
rutas.get('/sesiones/actual', autenticar, sesionActual);
export default rutas;