import { sucursalDe } from '../../intermedios/autenticar.js';
import { exigir, unoDe } from '../../utilidades/validar.js';
import * as servicio from './servicio.js';

export async function listar(req, res, next) {
  try {
    res.json(await servicio.listarProductos(req.query));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await servicio.obtenerProducto(req.params.id));
  } catch (error) {
    next(error);
  }
}

export async function menu(req, res, next) {
  try {
    res.json(await servicio.menuDeSucursal(sucursalDe(req)));
  } catch (error) {
    next(error);
  }
}

export async function crear(req, res, next) {
  try {
    exigir(req.body, ['nombre', 'categoria', 'tipo', 'precio']);
    unoDe(req.body.tipo, ['elaborado', 'reventa'], 'El tipo');
    res.status(201).json(await servicio.crearProducto(req.body));
  } catch (error) {
    next(error);
  }
}

export async function actualizar(req, res, next) {
  try {
    res.json(await servicio.actualizarProducto(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
}

export async function reemplazarReceta(req, res, next) {
  try {
    res.json(await servicio.reemplazarReceta(req.params.id, req.body.receta));
  } catch (error) {
    next(error);
  }
}
