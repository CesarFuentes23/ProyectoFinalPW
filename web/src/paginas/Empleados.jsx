import { useState } from 'react';
import api from '../api/cliente.js';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Encabezado,
  Etiqueta,
  Selector,
  Tabla,
  Ventana
} from '../componentes/ui.jsx';
import { dinero, fecha, hoyIso } from '../utilidades/formato.js';

const CARGOS = [
  { valor: 'barista', texto: 'Barista' },
  { valor: 'cajero', texto: 'Cajero' },
  { valor: 'cocina', texto: 'Cocina' },
  { valor: 'gerente', texto: 'Gerente' },
  { valor: 'administracion', texto: 'Administración' }
];
const NOMBRE_CARGO = Object.fromEntries(CARGOS.map((cargo) => [cargo.valor, cargo.texto]));
const NUEVO = {
  nombres: '',
  apellidos: '',
  dui: '',
  cargo: 'barista',
  salario_mensual: '',
  fecha_ingreso: hoyIso(),
  afp: 'Crecer',
  cuenta_banco: '',
  activo: true
};

export default function Empleados() {
  const { datos, cargando, error, recargar } = useConsulta('/empleados');
  const guardado = useEnvio();
  const [ficha, setFicha] = useState(null);

  const empleados = datos || [];
  const activos = empleados.filter((empleado) => empleado.activo);
  const nomina = activos.reduce((suma, empleado) => suma + empleado.salario_mensual, 0);

  async function guardar(evento) {
    evento.preventDefault();
    const cuerpo = { ...ficha, salario_mensual: Number(ficha.salario_mensual) };
    const respuesta = await guardado.enviar(() =>
      ficha.id ? api.actualizar(`/empleados/${ficha.id}`, cuerpo) : api.crear('/empleados', cuerpo)
    );
    if (respuesta) {
      setFicha(null);
      recargar();
    }
  }

  const columnas = [
    {
      titulo: 'Empleado',
      celda: (e) => (
        <span className="font-semibold">
          {e.apellidos}, {e.nombres}
        </span>
      )
    },
    { titulo: 'DUI', celda: (e) => e.dui },
    { titulo: 'Cargo', celda: (e) => NOMBRE_CARGO[e.cargo] },
    { titulo: 'Ingreso', celda: (e) => fecha(e.fecha_ingreso) },
    { titulo: 'AFP', celda: (e) => e.afp },
    {
      titulo: 'Estado',
      celda: (e) =>
        e.activo ? <Etiqueta tono="bien">Activo</Etiqueta> : <Etiqueta>De baja</Etiqueta>
    },
    { titulo: 'Salario mensual', derecha: true, celda: (e) => dinero(e.salario_mensual) }
  ];
  const campo = (nombre) => ({
    value: ficha[nombre] ?? '',
    onChange: (e) => setFicha({ ...ficha, [nombre]: e.target.value })
  });

  return (
    <div>
      <Encabezado
        titulo="Empleados"
        detalle={`${activos.length} personas activas. La nómina mensual suma ${dinero(nomina)}.`}
      >
        <Boton onClick={() => setFicha({ ...NUEVO })}>Agregar empleado</Boton>
      </Encabezado>
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla
          columnas={columnas}
          filas={empleados}
          alElegir={setFicha}
          vacio="Esta sucursal aún no tiene empleados"
        />
      )}

      {ficha && (
        <Ventana
          titulo={ficha.id ? 'Editar empleado' : 'Empleado nuevo'}
          alCerrar={() => setFicha(null)}
          ancho="max-w-xl"
        >
          <form onSubmit={guardar} className="space-y-3">
            <Aviso error={guardado.error} />
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Nombres" required {...campo('nombres')} />
              <Campo etiqueta="Apellidos" required {...campo('apellidos')} />
              <Campo
                etiqueta="DUI"
                required
                placeholder="00000000-0"
                pattern="\d{8}-\d"
                title="Escribe el DUI con guion, por ejemplo 01234567-8."
                {...campo('dui')}
              />
              <Selector etiqueta="Cargo" opciones={CARGOS} {...campo('cargo')} />
              <Campo
                etiqueta="Salario mensual"
                type="number"
                min="1"
                step="0.01"
                required
                {...campo('salario_mensual')}
              />
              <Campo etiqueta="Fecha de ingreso" type="date" required {...campo('fecha_ingreso')} />
              <Selector
                etiqueta="AFP"
                opciones={[
                  { valor: 'Crecer', texto: 'Crecer' },
                  { valor: 'Confía', texto: 'Confía' }
                ]}
                {...campo('afp')}
              />
              <Campo etiqueta="Cuenta bancaria" {...campo('cuenta_banco')} />
            </div>
            {ficha.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ficha.activo}
                  onChange={(e) => setFicha({ ...ficha, activo: e.target.checked })}
                />
                Sigue trabajando en la empresa
              </label>
            )}
            <Boton type="submit" disabled={guardado.enviando}>
              Guardar empleado
            </Boton>
          </form>
        </Ventana>
      )}
    </div>
  );
}
