import {
  bd,
  Producto,
  ComponenteReceta,
  Articulo,
  Existencia,
  Sucursal
} from '../../modelos/index.js';
import { redondear } from '../../utilidades/dinero.js';
import { noEncontrado, solicitudInvalida } from '../../utilidades/errores.js';
import { listaNoVacia, numeroPositivo } from '../../utilidades/validar.js';

const conReceta = { model: ComponenteReceta, as: 'receta', include: [Articulo] };

export function costoDeReceta(receta) {
  const costo = receta.reduce(
    (suma, componente) => suma + componente.cantidad * componente.articulo.costo_promedio,
    0
  );
  return redondear(costo, 4);
}

function presentar(producto, existencias = null) {
  const receta = producto.receta.map((componente) => ({
    articulo_id: componente.articulo_id,
    nombre: componente.articulo.nombre,
    unidad: componente.articulo.unidad,
    cantidad: componente.cantidad,
    costo: redondear(componente.cantidad * componente.articulo.costo_promedio, 4)
  }));
  const costo = costoDeReceta(producto.receta);
  const resultado = {
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    tipo: producto.tipo,
    precio: producto.precio,
    activo: producto.activo,
    costo,
    margen:
      producto.precio > 0
        ? redondear(((producto.precio / 1.13 - costo) / (producto.precio / 1.13)) * 100, 1)
        : 0,
    receta
  };

  if (existencias) {
    resultado.receta.forEach((componente) => {
      componente.existencia = existencias.get(componente.articulo_id) || 0;
    });
    const porciones = producto.receta.map((componente) => {
      const disponible = existencias.get(componente.articulo_id) || 0;
      return Math.floor(disponible / componente.cantidad);
    });
    resultado.disponibles = porciones.length > 0 ? Math.min(...porciones) : 0;
  }
  return resultado;
}

export async function listarProductos(filtros = {}) {
  const condicion = {};
  if (filtros.tipo) condicion.tipo = filtros.tipo;
  if (filtros.activos === 'true') condicion.activo = true;
  const productos = await Producto.findAll({
    where: condicion,
    include: [conReceta],
    order: [
      ['categoria', 'ASC'],
      ['nombre', 'ASC']
    ]
  });
  return productos.map((producto) => presentar(producto));
}

export async function obtenerProducto(id) {
  const producto = await Producto.findByPk(id, { include: [conReceta] });
  if (!producto) throw noEncontrado('El producto');
  return presentar(producto);
}

export async function menuDeSucursal(sucursalId) {
  const [productos, existencias] = await Promise.all([
    Producto.findAll({
      where: { activo: true },
      include: [conReceta],
      order: [
        ['categoria', 'ASC'],
        ['nombre', 'ASC']
      ]
    }),
    Existencia.findAll({ where: { sucursal_id: sucursalId } })
  ]);
  const porArticulo = new Map(
    existencias.map((existencia) => [existencia.articulo_id, existencia.cantidad])
  );
  return productos.map((producto) => presentar(producto, porArticulo));
}

async function validarReceta(receta, transaccion) {
  listaNoVacia(receta, 'La receta');
  const ids = receta.map((componente) => Number(componente.articulo_id));
  if (new Set(ids).size !== ids.length) throw solicitudInvalida('La receta repite un mismo insumo');

  const articulos = await Articulo.findAll({ where: { id: ids }, transaction: transaccion });
  if (articulos.length !== ids.length)
    throw solicitudInvalida('La receta incluye un insumo que no existe');

  return receta.map((componente) => ({
    articulo_id: Number(componente.articulo_id),
    cantidad: numeroPositivo(componente.cantidad, 'La cantidad de cada insumo')
  }));
}

async function verificarPrecio(precio, receta, transaccion) {
  const articulos = await Articulo.findAll({
    where: { id: receta.map((componente) => componente.articulo_id) },
    transaction: transaccion
  });
  const costoPorId = new Map(articulos.map((articulo) => [articulo.id, articulo.costo_promedio]));
  const costo = receta.reduce(
    (suma, componente) =>
      suma + componente.cantidad * (costoPorId.get(componente.articulo_id) || 0),
    0
  );
  const sinIva = precio / 1.13;
  if (costo > 0 && sinIva <= costo) {
    throw solicitudInvalida(
      `El precio sin IVA ($${sinIva.toFixed(2)}) no cubre ` +
        `el costo de la receta ($${costo.toFixed(2)})`
    );
  }
}

async function articuloDeReventa(datos, transaccion) {
  if (datos.articulo_id) return Number(datos.articulo_id);
  const articulo = await Articulo.create(
    { nombre: datos.nombre, tipo: 'reventa', unidad: 'unidad' },
    { transaction: transaccion }
  );
  const sucursales = await Sucursal.findAll({ where: { activa: true }, transaction: transaccion });
  await Existencia.bulkCreate(
    sucursales.map((sucursal) => ({
      articulo_id: articulo.id,
      sucursal_id: sucursal.id,
      cantidad: 0,
      minimo: 0
    })),
    { transaction: transaccion }
  );
  return articulo.id;
}

export async function crearProducto(datos) {
  const id = await bd.transaction(async (transaccion) => {
    let receta;
    if (datos.tipo === 'reventa') {
      receta = [{ articulo_id: await articuloDeReventa(datos, transaccion), cantidad: 1 }];
    } else {
      receta = await validarReceta(datos.receta, transaccion);
    }

    const precio = numeroPositivo(datos.precio, 'El precio');
    await verificarPrecio(precio, receta, transaccion);

    const producto = await Producto.create(
      {
        nombre: datos.nombre,
        categoria: datos.categoria,
        tipo: datos.tipo,
        precio
      },
      { transaction: transaccion }
    );

    await ComponenteReceta.bulkCreate(
      receta.map((componente) => ({ ...componente, producto_id: producto.id })),
      { transaction: transaccion }
    );
    return producto.id;
  });
  return obtenerProducto(id);
}

export async function actualizarProducto(id, datos) {
  const producto = await Producto.findByPk(id);
  if (!producto) throw noEncontrado('El producto');

  const cambios = {};
  if (datos.nombre !== undefined) cambios.nombre = datos.nombre;
  if (datos.categoria !== undefined) cambios.categoria = datos.categoria;
  if (datos.activo !== undefined) cambios.activo = Boolean(datos.activo);
  if (datos.precio !== undefined) {
    cambios.precio = numeroPositivo(datos.precio, 'El precio');
    const receta = await ComponenteReceta.findAll({ where: { producto_id: id } });
    await verificarPrecio(
      cambios.precio,
      receta.map((componente) => componente.toJSON())
    );
  }
  await producto.update(cambios);
  return obtenerProducto(id);
}

export async function reemplazarReceta(id, receta) {
  await bd.transaction(async (transaccion) => {
    const producto = await Producto.findByPk(id, { transaction: transaccion });
    if (!producto) throw noEncontrado('El producto');
    if (producto.tipo === 'reventa')
      throw solicitudInvalida('Un producto de reventa no lleva receta');

    const componentes = await validarReceta(receta, transaccion);
    await verificarPrecio(producto.precio, componentes, transaccion);
    await ComponenteReceta.destroy({ where: { producto_id: id }, transaction: transaccion });
    await ComponenteReceta.bulkCreate(
      componentes.map((componente) => ({ ...componente, producto_id: producto.id })),
      { transaction: transaccion }
    );
  });
  return obtenerProducto(id);
}
