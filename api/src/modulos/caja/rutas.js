import { Router } from 'express';
import { permitir } from '../../intermedios/autenticar.js';
import * as controlador from './controlador.js';

const rutas = Router();

rutas.get('/turnos', permitir('administrador', 'gerente'), controlador.listar);
rutas.post('/turnos', controlador.abrir);
rutas.get('/turnos/actual', controlador.actual);
rutas.get('/turnos/:id', controlador.obtener);
rutas.post('/turnos/:id/movimientos', controlador.crearMovimiento);
rutas.post('/turnos/:id/cierre', controlador.cerrar);

export default rutas;
