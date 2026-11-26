import { Router } from 'express';
import { permitir } from '../../intermedios/autenticar.js';
import * as controlador from './controlador.js';

const rutas = Router();
const jefatura = permitir('administrador', 'gerente');

rutas.get('/empleados', jefatura, controlador.listarEmpleados);
rutas.post('/empleados', jefatura, controlador.crearEmpleado);
rutas.put('/empleados/:id', jefatura, controlador.actualizarEmpleado);

rutas.get('/planillas/reglas', jefatura, controlador.reglasDePlanilla);
rutas.get('/planillas', jefatura, controlador.listarPlanillas);
rutas.post('/planillas', jefatura, controlador.crearPlanilla);
rutas.get('/planillas/:id', jefatura, controlador.obtenerPlanilla);
rutas.put('/planillas/:id/detalles/:detalleId', jefatura, controlador.ajustarDetalle);
rutas.post('/planillas/:id/cierre', jefatura, controlador.cerrarPlanilla);
rutas.delete('/planillas/:id', jefatura, controlador.eliminarPlanilla);

export default rutas;
