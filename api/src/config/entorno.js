import 'dotenv/config';

const entorno = {
  puerto: Number(process.env.PUERTO) || 4000,
  bd: {
    host: process.env.BD_HOST || 'localhost',
    puerto: Number(process.env.BD_PUERTO) || 5433,
    nombre: process.env.BD_NOMBRE || 'origenes_sv',
    usuario: process.env.BD_USUARIO || 'postgres',
    clave: process.env.BD_CLAVE || 'postgres'
  },
  jwt: {
    secreto: process.env.JWT_SECRETO || 'secreto-de-desarrollo',
    duracion: process.env.JWT_DURACION || '10h'
  },
  origenWeb: process.env.ORIGEN_WEB || 'http://localhost:5173'
};

export default entorno;
