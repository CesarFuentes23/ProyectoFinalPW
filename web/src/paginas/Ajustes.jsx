import { useState } from 'react';
import api from '../api/cliente.js';
import { useSesion } from '../contexto/Sesion.jsx';
import useConsulta from '../ganchos/useConsulta.js';
import useEnvio from '../ganchos/useEnvio.js';
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Encabezado,
  Etiqueta,
  Pestanas,
  Selector,
  Tabla,
  Ventana
} from '../componentes/ui.jsx';
import { NOMBRE_ROL } from '../utilidades/formato.js';

function Sucursales() {
  const { recargarSucursales } = useSesion();
  const { datos, cargando, error, recargar } = useConsulta('/sucursales');
  const guardado = useEnvio();
  const [ficha, setFicha] = useState(null);

  async function guardar(evento) {
    evento.preventDefault();
    const respuesta = await guardado.enviar(() =>
      ficha.id ? api.actualizar(`/sucursales/${ficha.id}`, ficha) : api.crear('/sucursales', ficha)
    );
    if (respuesta) {
      setFicha(null);
      recargar();
      recargarSucursales();
    }
  }

  const columnas = [
    { titulo: 'Código', celda: (s) => <span className="font-semibold">{s.codigo}</span> },
    { titulo: 'Sucursal', celda: (s) => s.nombre },
    { titulo: 'Dirección', celda: (s) => `${s.direccion || ''}, ${s.municipio || ''}` },
    { titulo: 'Teléfono', celda: (s) => s.telefono },
    {
      titulo: 'Estado',
      celda: (s) =>
        s.activa ? <Etiqueta tono="bien">Abierta</Etiqueta> : <Etiqueta>Cerrada</Etiqueta>
    }
  ];
  const campo = (nombre) => ({
    value: ficha[nombre] ?? '',
    onChange: (e) => setFicha({ ...ficha, [nombre]: e.target.value })
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Boton onClick={() => setFicha({ codigo: '', nombre: '', activa: true })}>
          Agregar sucursal
        </Boton>
      </div>
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla columnas={columnas} filas={datos || []} alElegir={setFicha} />
      )}
      {ficha && (
        <Ventana
          titulo={ficha.id ? 'Editar sucursal' : 'Sucursal nueva'}
          alCerrar={() => setFicha(null)}
        >
          <form onSubmit={guardar} className="space-y-3">
            <Aviso error={guardado.error} />
            <div className="grid grid-cols-3 gap-3">
              <Campo
                etiqueta="Código"
                required
                maxLength="6"
                disabled={Boolean(ficha.id)}
                ayuda="Va en el número de cada factura."
                {...campo('codigo')}
              />
              <Campo etiqueta="Nombre" required className="col-span-2" {...campo('nombre')} />
            </div>
            <Campo etiqueta="Dirección" {...campo('direccion')} />
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Municipio" {...campo('municipio')} />
              <Campo etiqueta="Teléfono" {...campo('telefono')} />
            </div>
            <Boton type="submit" disabled={guardado.enviando}>
              Guardar sucursal
            </Boton>
          </form>
        </Ventana>
      )}
    </>
  );
}

function Usuarios() {
  const { sucursales } = useSesion();
  const { datos, cargando, error, recargar } = useConsulta('/usuarios');
  const guardado = useEnvio();
  const [ficha, setFicha] = useState(null);

  async function guardar(evento) {
    evento.preventDefault();
    const cuerpo = { ...ficha, sucursal_id: ficha.sucursal_id ? Number(ficha.sucursal_id) : null };
    if (!cuerpo.clave) delete cuerpo.clave;
    const respuesta = await guardado.enviar(() =>
      ficha.id ? api.actualizar(`/usuarios/${ficha.id}`, cuerpo) : api.crear('/usuarios', cuerpo)
    );
    if (respuesta) {
      setFicha(null);
      recargar();
    }
  }

  const columnas = [
    { titulo: 'Nombre', celda: (u) => <span className="font-semibold">{u.nombre}</span> },
    { titulo: 'Correo', celda: (u) => u.correo },
    { titulo: 'Acceso', celda: (u) => NOMBRE_ROL[u.rol] },
    { titulo: 'Sucursal', celda: (u) => u.sucursal?.nombre || 'Todas' },
    {
      titulo: 'Estado',
      celda: (u) =>
        u.activo ? <Etiqueta tono="bien">Activo</Etiqueta> : <Etiqueta>Bloqueado</Etiqueta>
    }
  ];
  const campo = (nombre) => ({
    value: ficha[nombre] ?? '',
    onChange: (e) => setFicha({ ...ficha, [nombre]: e.target.value })
  });

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Boton
          onClick={() =>
            setFicha({
              nombre: '',
              correo: '',
              clave: '',
              rol: 'cajero',
              sucursal_id: sucursales[0]?.id || '',
              activo: true
            })
          }
        >
          Agregar usuario
        </Boton>
      </div>
      <Aviso error={error} />
      {cargando ? (
        <Cargando />
      ) : (
        <Tabla
          columnas={columnas}
          filas={datos || []}
          alElegir={(u) =>
            setFicha({
              id: u.id,
              nombre: u.nombre,
              correo: u.correo,
              rol: u.rol,
              sucursal_id: u.sucursal_id || '',
              activo: u.activo,
              clave: ''
            })
          }
        />
      )}
      {ficha && (
        <Ventana
          titulo={ficha.id ? 'Editar usuario' : 'Usuario nuevo'}
          alCerrar={() => setFicha(null)}
        >
          <form onSubmit={guardar} className="space-y-3">
            <Aviso error={guardado.error} />
            <Campo etiqueta="Nombre" required {...campo('nombre')} />
            <Campo
              etiqueta="Correo"
              type="email"
              required
              disabled={Boolean(ficha.id)}
              {...campo('correo')}
            />
            <div className="grid grid-cols-2 gap-3">
              <Selector
                etiqueta="Acceso"
                opciones={Object.entries(NOMBRE_ROL).map(([valor, texto]) => ({ valor, texto }))}
                {...campo('rol')}
              />
              <Selector
                etiqueta="Sucursal"
                opciones={sucursales.map((s) => ({ valor: s.id, texto: s.nombre }))}
                {...campo('sucursal_id')}
              />
            </div>
            <Campo
              etiqueta={ficha.id ? 'Contraseña nueva' : 'Contraseña'}
              type="password"
              minLength="8"
              required={!ficha.id}
              ayuda={ficha.id ? 'Déjala vacía para conservar la actual.' : 'Mínimo 8 caracteres.'}
              {...campo('clave')}
            />
            {ficha.id && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ficha.activo}
                  onChange={(e) => setFicha({ ...ficha, activo: e.target.checked })}
                />
                Puede ingresar al sistema
              </label>
            )}
            <Boton type="submit" disabled={guardado.enviando}>
              Guardar usuario
            </Boton>
          </form>
        </Ventana>
      )}
    </>
  );
}

export default function Ajustes() {
  const [pestana, setPestana] = useState('sucursales');
  return (
    <div>
      <Encabezado
        titulo="Sucursales y usuarios"
        detalle="Solo la administración puede cambiar estos datos."
      />
      <Pestanas
        activa={pestana}
        alCambiar={setPestana}
        opciones={[
          { valor: 'sucursales', texto: 'Sucursales' },
          { valor: 'usuarios', texto: 'Usuarios' }
        ]}
      />
      {pestana === 'sucursales' ? <Sucursales /> : <Usuarios />}
    </div>
  );
}
