import { sucursalDe } from '../../intermedios/autenticar.js';
import { exigir } from '../../utilidades/validar.js';
import * as servicio from './servicio.js';

export async function abrir(req, res, next) {
  try {
    exigir(req.body, ['fondo_inicial']);
    const turno = await servicio.abrirTurno({
      usuario: req.usuario,
      sucursalId: sucursalDe(req),
      fondoInicial: req.body.fondo_inicial
    });
    res.status(201).json(turno);
  } catch (error) {
    next(error);
  }
}

export async function actual(req, res, next) {
  try {
    res.json(await servicio.turnoActual({ usuario: req.usuario, sucursalId: sucursalDe(req) }));
  } catch (error) {
    next(error);
  }
}

export async function listar(req, res, next) {
  try {
    const todas = req.usuario.rol === 'administrador' && !req.query.sucursal_id;
    res.json(await servicio.listarTurnos(todas ? null : sucursalDe(req), req.query));
  } catch (error) {
    next(error);
  }
}

export async function obtener(req, res, next) {
  try {
    res.json(await servicio.obtenerTurno(req.params.id, req.usuario));
  } catch (error) {
    next(error);
  }
}

export async function crearMovimiento(req, res, next) {
  try {
    exigir(req.body, ['tipo', 'monto', 'motivo']);
    res.status(201).json(
      await servicio.registrarMovimiento({
        id: req.params.id,
        usuario: req.usuario,
        datos: req.body
      })
    );
  } catch (error) {
    next(error);
  }
}
export async function cerrar(req, res, next) {
  try {
    exigir(req.body, ['contado_efectivo', 'contado_tarjeta', 'contado_bitcoin']);
    res
      .status(201)
      .json(
        await servicio.cerrarTurno({ id: req.params.id, usuario: req.usuario, datos: req.body })
      );
  } catch (error) {
    next(error);
  }
}
