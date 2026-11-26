import { Router } from 'express';
import { permitir } from '../../intermedios/autenticar.js';
import * as controlador from './controlador.js';

const rutas = Router();

const jefatura = permitir('administrador', 'gerente');

rutas.get('/articulos', controlador.listarArticulos);
rutas.post('/articulos', jefatura, controlador.crearArticulo);
rutas.put('/articulos/:id', jefatura, controlador.actualizarArticulo);

rutas.get('/existencias', controlador.listarExistencias);
rutas.get('/existencias/alertas', controlador.listarAlertas);
rutas.put('/existencias/:articuloId/minimo', jefatura, controlador.fijarMinimo);

rutas.get('/movimientos-inventario', jefatura, controlador.listarMovimientos);
rutas.get('/movimientos-inventario/resumen', jefatura, controlador.contarMovimientos);

rutas.post('/ajustes-inventario', jefatura, controlador.crearAjuste);

export default rutas;