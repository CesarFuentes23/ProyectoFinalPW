import { Articulo, Existencia, Sucursal } from '../../modelos/index.js';
import { sucursalDe } from '../../intermedios/autenticar.js';
import { exigir, numeroPositivo, tomar, unoDe } from '../../utilidades/validar.js';
import { noEncontrado } from '../../utilidades/errores.js';
import * as servicio from './servicio.js';

const CAMPOS_ARTICULO = ['nombre', 'tipo', 'unidad', 'activo'];

export async function listarArticulos(req, res, next) {
    try {
        const condicion = {};

        if (req.query.tipo) condicion.tipo = req.query.tipo;
        if (req.query.activos === 'true') condicion.activo = true;

        res.json(await Articulo.findAll({ where: condicion, order: [['nombre', 'ASC']] }));
    } catch (error) {
        next(error);
    }
}

export async function crearArticulo(req, res, next) {
    try {
        exigir(req.body, ['nombre', 'tipo', 'unidad']);
        unoDe(req.body.tipo, ['insumo', 'empaque', 'reventa'], 'El tipo');
        unoDe(req.body.unidad, ['g', 'ml', 'unidad'], 'La unidad');

        const articulo = await Articulo.create(tomar(req.body, CAMPOS_ARTICULO));
        const minimo = req.body.minimo ? numeroPositivo(req.body.minimo, 'El mínimo', true) : 0;

        const sucursales = await Sucursal.findAll({ where: { activa: true } });

        await Existencia.bulkCreate(
            sucursales.map((sucursal) => ({
                articulo_id: articulo.id,
                sucursal_id: sucursal.id,
                cantidad: 0,
                minimo
            }))
        );

        res.status(201).json(articulo);
    } catch (error) {
        next(error);
    }
}

export async function actualizarArticulo(req, res, next) {
    try {
        const articulo = await Articulo.findByPk(req.params.id);

        if (!articulo) throw noEncontrado('El artículo');

        await articulo.update(tomar(req.body, ['nombre', 'activo']));

        res.json(articulo);
    } catch (error) {
        next(error);
    }
}

export async function listarExistencias(req, res, next) {
    try {
        res.json(await servicio.listarExistencias(sucursalDe(req), req.query));
    } catch (error) {
        next(error);
    }
}

export async function listarAlertas(req, res, next) {
    try {
        const todas = req.usuario.rol === 'administrador' && !req.query.sucursal_id;

        res.json(await servicio.listarAlertas(todas ? null : sucursalDe(req)));
    } catch (error) {
        next(error);
    }
}

export async function crearAjuste(req, res, next) {
    try {
        exigir(req.body, ['articulo_id', 'cantidad', 'tipo', 'nota']);
        unoDe(req.body.tipo, ['ajuste', 'merma'], 'El tipo');

        const resultado = await servicio.ajustar({
            articuloId: req.body.articulo_id,
            sucursalId: sucursalDe(req),
            cantidadContada: numeroPositivo(
                req.body.cantidad,
                'La cantidad',
                req.body.tipo === 'ajuste'
            ),
            tipo: req.body.tipo,
            nota: req.body.nota,
            usuarioId: req.usuario.id
        });

        res.status(201).json(resultado);
    } catch (error) {
        next(error);
    }
}

export async function fijarMinimo(req, res, next) {
    try {
        exigir(req.body, ['minimo']);

        const existencia = await servicio.fijarMinimo({
            articuloId: req.params.articuloId,
            sucursalId: sucursalDe(req),
            minimo: numeroPositivo(req.body.minimo, 'El mínimo', true)
        });

        res.json(existencia);
    } catch (error) {
        next(error);
    }
}

export async function contarMovimientos(req, res, next) {
    try {
        res.json(await servicio.contarMovimientos(sucursalDe(req), req.query));
    } catch (error) {
        next(error);
    }
}

export async function listarMovimientos(req, res, next) {
    try {
        res.json(await servicio.listarMovimientos(sucursalDe(req), req.query));
    } catch (error) {
        next(error);
    }
}