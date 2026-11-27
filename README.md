# Orígenes SV

ERP y punto de venta para el Restaurante Orígenes SV, un negocio de comida de especialidad con varias sucursales en El Salvador. Proyecto de cátedra de Programación Web, ciclo 02-2026.

## Qué resuelve

| Módulo | Qué hace |
|---|---|
| Ventas y facturación | Toma de pedidos, factura de consumidor final y comprobante de crédito fiscal con correlativo por sucursal y 13 % de IVA |
| Inventario y recetas | Cada producto elaborado descuenta sus insumos y empaques al venderse; los productos empacados descuentan una unidad; alertas de existencia mínima |
| Compras y proveedores | Facturas de compra que suman a bodega, costo promedio, cuentas por pagar y pagos a proveedores, separando costos de gastos |
| Caja | Apertura y cierre por turno con cuadre de efectivo, tarjetas y Bitcoin o Chivo Wallet |
| Recursos humanos | Empleados y planilla quincenal con ISSS, AFP y retención de renta |

## Tecnologías

- API: Node.js, Express, Sequelize y PostgreSQL
- Web: React, Vite, React Router y Tailwind CSS
- Despliegue: Nginx como servidor de archivos y proxy inverso

## Requisitos

- Node.js 20 o superior
- Docker Desktop, o PostgreSQL 14 o superior instalado en la máquina

## Puesta en marcha

1. Clonar el repositorio.

2. Levantar PostgreSQL. Con Docker, la primera vez:

   ```
   docker run --name origenes-pg -e POSTGRES_PASSWORD=postgres -p 5433:5432 -d postgres:16
   ```

   Las siguientes veces basta con `docker start origenes-pg`. Se usa el puerto 5433 para no chocar con otro PostgreSQL que ya ocupe el 5432.

   La API ya trae esa configuración por defecto: servidor `localhost`, puerto `5433`, usuario `postgres` y contraseña `postgres`. Si se usan esos valores no hace falta crear el archivo `.env`.

   Si PostgreSQL está instalado de otra forma, copiar `api/.env.example` a `api/.env` y cambiar ahí el puerto, el usuario o la contraseña. El `.env` tiene prioridad sobre los valores por defecto.

   ```
   cd api
   npm install
   ```

3. Crear la base, las tablas y los datos de ejemplo.

   ```
   npm run bd:preparar
   ```

   Este comando crea la base `origenes_sv` si no existe. Si ya existe, borra sus tablas y las vuelve a llenar. Tarda alrededor de medio minuto porque registra un mes de ventas.

4. Encender la API.

   ```
   npm run dev
   ```

   Queda en http://localhost:4000/api/v1

5. En otra terminal, encender la web.

   ```
   cd web
   npm install
   npm run dev
   ```

   Queda en http://localhost:5173

## Cuentas de ejemplo

Todas usan la contraseña `Origenes2026`.

| Correo | Acceso | Sucursal |
|---|---|---|
| admin@origenes.sv | Administración | Todas |
| gerente.escalon@origenes.sv | Gerencia | Escalón |
| caja.escalon@origenes.sv | Caja | Escalón |
| barra.escalon@origenes.sv | Barra | Escalón |
| gerente.tecla@origenes.sv | Gerencia | Santa Tecla |
| caja.tecla@origenes.sv | Caja | Santa Tecla |
| gerente.santaana@origenes.sv | Gerencia | Santa Ana |
| caja.santaana@origenes.sv | Caja | Santa Ana |

Los datos de ejemplo cubren las tres sucursales y se generan día por día en orden: inventario inicial, compras semanales de reposición, ventas desde el primer día del mes hasta ayer (al menos seis días), mermas y conteos físicos, existencias distintas en cada sucursal y las planillas cerradas de las quincenas recientes. En total son unas 1,100 ventas. Por eso el saldo de cada artículo en Entradas y salidas cuadra de un movimiento al siguiente. Santa Tecla además trae una caja abierta con ventas de hoy, para que el resumen del día tenga datos. Escalón y Santa Ana empiezan el día sin ventas, así se puede mostrar cómo se abre la caja.

## Estructura

```
api/
  src/
    config/        variables de entorno, conexión y reglas del negocio
    modelos/       tablas y relaciones
    intermedios/   autenticación, permisos y manejo de errores
    modulos/       un directorio por módulo: rutas, controlador y servicio
    utilidades/    dinero, fechas, validaciones y errores
    semilla/       datos de ejemplo
  pruebas/         pruebas de los cálculos de IVA y planilla
web/
  src/
    api/           cliente HTTP
    contexto/      sesión y sucursal activa
    ganchos/       hooks para consultar y enviar datos
    componentes/   piezas compartidas de interfaz
    paginas/       una pantalla por módulo
despliegue/        configuración de Nginx
docs/              documentación del proyecto
```

## Recursos de la API

Todas las rutas van bajo `/api/v1` y, salvo el inicio de sesión, piden el encabezado `Authorization: Bearer <token>`.

| Recurso | Rutas |
|---|---|
| Sesión | `POST /sesiones`, `GET /sesiones/actual` |
| Sucursales y usuarios | `GET POST /sucursales`, `PUT /sucursales/:id`, `GET POST /usuarios`, `PUT /usuarios/:id` |
| Menú | `GET /menu`, `GET POST /productos`, `GET PUT /productos/:id`, `PUT /productos/:id/receta` |
| Inventario | `GET POST /articulos`, `PUT /articulos/:id`, `GET /existencias`, `GET /existencias/alertas`, `PUT /existencias/:articuloId/minimo`, `GET /movimientos-inventario`, `POST /ajustes-inventario` |
| Ventas | `GET POST /ventas`, `GET /ventas/:id`, `POST /ventas/:id/anulacion`, `GET POST /clientes`, `PUT /clientes/:id` |
| Compras | `GET POST /proveedores`, `PUT /proveedores/:id`, `GET POST /compras`, `GET /compras/resumen`, `GET /compras/:id`, `POST /compras/:id/pagos`, `GET /cuentas-por-pagar` |
| Caja | `GET POST /turnos`, `GET /turnos/actual`, `GET /turnos/:id`, `POST /turnos/:id/movimientos`, `POST /turnos/:id/cierre` |
| Personal | `GET POST /empleados`, `PUT /empleados/:id`, `GET POST /planillas`, `GET /planillas/reglas`, `GET DELETE /planillas/:id`, `PUT /planillas/:id/detalles/:detalleId`, `POST /planillas/:id/cierre` |
| Resumen | `GET /tablero` |

## Pruebas

```
cd api
npm test
npm run prueba:concurrencia
```

La primera ejecuta las pruebas de cálculo. La segunda lanza 40 ventas simultáneas sobre la base ya preparada y revisa correlativos e inventario.

## Despliegue con Nginx

1. En el servidor, clonar el repositorio en `/var/www/origenes-sv` y preparar la API como en la puesta en marcha.
2. Generar la web: `cd web && npm install && npm run build`.
3. Encender la API con `npm start` dentro de `api`.
4. Copiar `despliegue/nginx.conf` a `/etc/nginx/sites-available/origenes-sv`, enlazarlo en `sites-enabled` y recargar Nginx.

Nginx entrega la carpeta `web/dist` y reenvía todo lo que empieza con `/api/` a la API en el puerto 4000.

## Reglas de negocio aplicadas

- Los precios del menú incluyen IVA. El documento muestra el valor sin IVA y el 13 % por separado.
- El comprobante de crédito fiscal exige un cliente con NIT y NRC.
- Una venta no se registra si falta algún insumo de la receta; el mensaje indica cuál y cuánto falta.
- Solo se anulan ventas de un turno de caja abierto. La anulación devuelve los insumos y conserva el correlativo.
- ISSS del empleado 3 % con salario máximo cotizable de $1,000 mensuales. AFP del empleado 7.25 %.
- La retención de renta usa la tabla quincenal guardada en `tramo_renta`, sobre lo devengado menos ISSS y AFP.

## Documentación

| Documento | Ubicación |
|---|---|
| Documentación técnica | `docs/pdf/Documentacion_tecnica.pdf` |
| Manual de usuario | `docs/pdf/Manual_de_usuario.pdf` |
| Declaración de uso de IA | `docs/pdf/Declaracion_uso_IA.pdf` |
| Bitácora de prompts y contextos | `docs/pdf/Bitacora_prompts_IA.pdf` |
| Artículo en formato IEEE | `docs/paper/Origenes_SV_IEEE.pdf` |
| Seguimiento del trabajo | `docs/equipo/seguimiento.xlsx` |
| Diagramas | `docs/diagramas/` |

## Uso de inteligencia artificial

El código y la documentación se elaboraron con apoyo de un agente de IA. El equipo lo declara en `docs/pdf/Declaracion_uso_IA.pdf` y registra cada prompt y contexto en `docs/pdf/Bitacora_prompts_IA.pdf`.

## Equipo

| Integrante | Carnet | Rol |
|---|---|---|
| Carlos Alberto Flores Bonilla | 00079225 | Coordinación, arquitectura y acceso |
| Diego Roberto Cruz Novoa | 00140725 | Ventas y facturación |
| Alejandra Paola Orellana Valladares | 00108225 | Inventario y recetas |
| César Fernando Fuentes Moreno | 00118825 | Compras y proveedores |
| Diego Alberto Figueroa Rodas | 00101024 | Caja y resumen del día |
| José Daniel Argueta Méndez | 00045324 | Personal, planilla y pruebas |
| Jefferson Alejandro Alvarado Argueta | 00067525 | Interfaz común y despliegue |
