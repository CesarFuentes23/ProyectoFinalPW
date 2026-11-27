import bcrypt from 'bcryptjs';
import { Sucursal, Usuario, Correlativo, Empleado } from '../../modelos/index.js';
import { ROLES, TIPOS_DOCUMENTO } from '../../config/reglas.js';
import { exigir, tomar, unoDe } from '../../utilidades/validar.js';
import { noEncontrado, solicitudInvalida } from '../../utilidades/errores.js';

const CAMPOS_SUCURSAL = ['codigo', 'nombre', 'direccion', 'municipio', 'telefono', 'activa'];

export async function listarSucursales(req, res, next) {
  try {
    const sucursales = await Sucursal.findAll({ order: [['nombre', 'ASC']] });
    res.json(sucursales);
  } catch (error) {
    next(error);
  }
}

export async function crearSucursal(req, res, next) {
  try {
    exigir(req.body, ['codigo', 'nombre']);
    const datos = tomar(req.body, CAMPOS_SUCURSAL);
    datos.codigo = String(datos.codigo).toUpperCase();
    const sucursal = await Sucursal.create(datos);
    await Correlativo.bulkCreate(
      TIPOS_DOCUMENTO.map((tipo) => ({ sucursal_id: sucursal.id, tipo_documento: tipo }))
    );
    res.status(201).json(sucursal);
  } catch (error) {
    next(error);
  }
}

export async function actualizarSucursal(req, res, next) {
  try {
    const sucursal = await Sucursal.findByPk(req.params.id);
    if (!sucursal) throw noEncontrado('La sucursal');
    await sucursal.update(
      tomar(
        req.body,
        CAMPOS_SUCURSAL.filter((campo) => campo !== 'codigo')
      )
    );
    res.json(sucursal);
  } catch (error) {
    next(error);
  }
}

export async function listarUsuarios(req, res, next) {
  try {
    const usuarios = await Usuario.findAll({
      include: [Sucursal, Empleado],
      order: [['nombre', 'ASC']]
    });
    res.json(usuarios);
  } catch (error) {
    next(error);
  }
}

export async function crearUsuario(req, res, next) {
  try {
    exigir(req.body, ['nombre', 'correo', 'clave', 'rol']);
    unoDe(req.body.rol, ROLES, 'El rol');
    if (String(req.body.clave).length < 8)
      throw solicitudInvalida('La contraseña debe tener al menos 8 caracteres');
    if (req.body.rol !== 'administrador' && !req.body.sucursal_id) {
      throw solicitudInvalida('Asigna una sucursal a este usuario');
    }
    const usuario = await Usuario.create({
      nombre: req.body.nombre,
      correo: String(req.body.correo).trim().toLowerCase(),
      clave_hash: await bcrypt.hash(String(req.body.clave), 10),
      rol: req.body.rol,
      sucursal_id: req.body.sucursal_id || null,
      empleado_id: req.body.empleado_id || null
    });
    res.status(201).json(await Usuario.findByPk(usuario.id, { include: Sucursal }));
  } catch (error) {
    next(error);
  }
}

export async function actualizarUsuario(req, res, next) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) throw noEncontrado('El usuario');
    const cambios = tomar(req.body, ['nombre', 'rol', 'sucursal_id', 'empleado_id', 'activo']);
    if (cambios.rol) unoDe(cambios.rol, ROLES, 'El rol');
    if (req.body.clave) {
      if (String(req.body.clave).length < 8)
        throw solicitudInvalida('La contraseña debe tener al menos 8 caracteres');
      cambios.clave_hash = await bcrypt.hash(String(req.body.clave), 10);
    }
    await usuario.update(cambios);
    res.json(await Usuario.findByPk(usuario.id, { include: Sucursal }));
  } catch (error) {
    next(error);
  }
}
