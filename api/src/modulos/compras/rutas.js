import { Router } from 'express';
import { permitir } from '../../intermedios/autenticar.js';
import * as controlador from './controlador.js';

const rutas = Router();
const jefatura = permitir('administrador', 'gerente');

rutas.get('/proveedores', jefatura, controlador.listarProveedores);
rutas.post('/proveedores', jefatura, controlador.crearProveedor);
rutas.put('/proveedores/:id', jefatura, controlador.actualizarProveedor);

rutas.get('/compras', jefatura, controlador.listarCompras);
rutas.get('/compras/resumen', jefatura, controlador.resumen);
rutas.post('/compras', jefatura, controlador.crearCompra);
rutas.get('/compras/:id', jefatura, controlador.obtenerCompra);
rutas.post('/compras/:id/pagos', jefatura, controlador.crearPago);

rutas.get('/cuentas-por-pagar', jefatura, controlador.cuentasPorPagar);

export default rutas;
