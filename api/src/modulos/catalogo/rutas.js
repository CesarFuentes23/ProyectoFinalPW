import { Router } from 'express';
import { permitir } from '../../intermedios/autenticar.js';
import * as controlador from './controlador.js';

const rutas = Router();

const jefatura = permitir('administrador', 'gerente');

rutas.get('/menu', controlador.menu);
rutas.get('/productos', controlador.listar);
rutas.get('/productos/:id', controlador.obtener);
rutas.post('/productos', jefatura, controlador.crear);
rutas.put('/productos/:id', jefatura, controlador.actualizar);
rutas.put('/productos/:id/receta', jefatura, controlador.reemplazarReceta);

export default rutas;
