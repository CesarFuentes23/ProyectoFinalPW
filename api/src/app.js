import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import entorno from './config/entorno.js';
import { autenticar } from './intermedios/autenticar.js';
import { manejarErrores, rutaDesconocida } from './intermedios/errores.js';
import rutasAcceso from './modulos/acceso/rutas.js';
import rutasOrganizacion from './modulos/organizacion/rutas.js';
import rutasCatalogo from './modulos/catalogo/rutas.js';
import rutasInventario from './modulos/inventario/rutas.js';
import rutasVentas from './modulos/ventas/rutas.js';
import rutasCompras from './modulos/compras/rutas.js';
import rutasCaja from './modulos/caja/rutas.js';
import rutasPersonal from './modulos/personal/rutas.js';
import rutasTablero from './modulos/tablero/rutas.js';

const app = express();

app.use(cors({ origin: entorno.origenWeb.split(',') }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/v1/estado', (req, res) => res.json({ servicio: 'Orígenes SV', activo: true }));

const api = express.Router();
api.use(rutasAcceso);
api.use(autenticar);
api.use(rutasOrganizacion);
api.use(rutasCatalogo);
api.use(rutasInventario);
api.use(rutasVentas);
api.use(rutasCompras);
api.use(rutasCaja);
api.use(rutasPersonal);
api.use(rutasTablero);

app.use('/api/v1', api);
app.use(rutaDesconocida);
app.use(manejarErrores);

export default app;