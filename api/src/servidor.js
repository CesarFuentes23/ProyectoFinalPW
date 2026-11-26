import app from './app.js';
import entorno from './config/entorno.js';
import { bd } from './modelos/index.js';

async function iniciar() {
  try {
    await bd.authenticate();
    app.listen(entorno.puerto, () => {
      console.log(`API de Orígenes SV en http://localhost:${entorno.puerto}/api/v1`);
    });
  } catch (error) {
    console.error('No se pudo conectar a PostgreSQL:', error.message);
    process.exit(1);
  }
}

iniciar();
