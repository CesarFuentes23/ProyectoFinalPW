import { Op } from 'sequelize';
import { Cliente } from '../../modelos/index.js';
import { TIPOS_DOCUMENTO } from '../../config/reglas.js';
import { sucursalDe } from '../../intermedios/autenticar.js';
import { exigir, tomar, unoDe } from '../../utilidades/validar.js';
import { noEncontrado, solicitudInvalida } from '../../utilidades/errores.js';
import * as servicio from './servicio.js';

const CAMPOS_CLIENTE = ['nombre', 'nit', 'nrc', 'giro', 'direccion', 'correo'];

export async function crearVenta(req, res, next) {
  try {
    exigir(req.body, ['tipo_documento', 'lineas', 'pagos']);
    const venta = await servicio.registrarVenta({
      usuario: req.usuario,
      sucursalId: sucursalDe(req),
      tipoDocumento: unoDe(req.body.tipo_documento, TIPOS_DOCUMENTO, 'El tipo de documento'),
      clienteId: req.body.cliente_id,
      lineas: req.body.lineas,
      pagos: req.body.pagos,
      efectivoRecibido: req.body.efectivo_recibido
    });
    res.status(201).json(venta);
  } catch (error) {
    next(error);
  }
}

export async function listarVentas(req, res, next) {
  try {
    res.json(await servicio.listarVentas(sucursalDe(req), req.query));
  } catch (error) {
    next(error);
  }
}

export async function obtenerVenta(req, res, next) {
  try {
    const sucursalId = req.usuario.rol === 'administrador' ? null : req.usuario.sucursal_id;
    res.json(await servicio.obtenerVenta(req.params.id, sucursalId));
  } catch (error) {
    next(error);
  }
}

export async function anularVenta(req, res, next) {
  try {
    exigir(req.body, ['motivo']);
    const motivo = String(req.body.motivo).trim();
    if (motivo.length < 10)
      throw solicitudInvalida('Explica el motivo de la anulación con al menos 10 caracteres');
    const venta = await servicio.anularVenta({
      id: req.params.id,
      sucursalId: sucursalDe(req),
      usuario: req.usuario,
      motivo
    });
    res.status(201).json(venta);
  } catch (error) {
    next(error);
  }
}

export async function listarClientes(req, res, next) {
  try {
    const condicion = {};
    if (req.query.buscar) {
      condicion[Op.or] = [
        { nombre: { [Op.iLike]: `%${req.query.buscar}%` } },
        { nit: { [Op.iLike]: `%${req.query.buscar}%` } },
        { nrc: { [Op.iLike]: `%${req.query.buscar}%` } }
      ];
    }
    res.json(await Cliente.findAll({ where: condicion, order: [['nombre', 'ASC']], limit: 100 }));
  } catch (error) {
    next(error);
  }
}

export async function crearCliente(req, res, next) {
  try {
    exigir(req.body, ['nombre']);
    res.status(201).json(await Cliente.create(tomar(req.body, CAMPOS_CLIENTE)));
  } catch (error) {
    next(error);
  }
}

export async function actualizarCliente(req, res, next) {
  try {
    const cliente = await Cliente.findByPk(req.params.id);
    if (!cliente) throw noEncontrado('El cliente');
    await cliente.update(tomar(req.body, CAMPOS_CLIENTE));
    res.json(cliente);
  } catch (error) {
    next(error);
  }
}
