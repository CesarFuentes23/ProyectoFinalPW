import { Navigate, Route, Routes } from 'react-router-dom';
import { useSesion } from './contexto/Sesion.jsx';
import Marco from './componentes/Marco.jsx';
import { Cargando } from './componentes/ui.jsx';
import Ingreso from './paginas/Ingreso.jsx';
import PuntoVenta from './paginas/PuntoVenta.jsx';
import Caja from './paginas/Caja.jsx';
import Ventas from './paginas/Ventas.jsx';
import Inventario from './paginas/Inventario.jsx';
import Menu from './paginas/Menu.jsx';
import Compras from './paginas/Compras.jsx';
import Empleados from './paginas/Empleados.jsx';
import Planilla from './paginas/Planilla.jsx';
import Resumen from './paginas/Resumen.jsx';
import Ajustes from './paginas/Ajustes.jsx';

function SoloJefatura({ children, soloAdmin = false }) {
  const { usuario, esJefatura } = useSesion();
  const permitido = soloAdmin ? usuario.rol === 'administrador' : esJefatura;
  return permitido ? children : <Navigate to="/vender" replace />;
}

export default function App() {
  const { usuario, cargando, esJefatura } = useSesion();

  if (cargando) return <Cargando texto="Abriendo Orígenes" />;

  if (!usuario) {
    return (
      <Routes>
        <Route path="/ingresar" element={<Ingreso />} />
        <Route path="*" element={<Navigate to="/ingresar" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Marco />}>
        <Route path="/vender" element={<PuntoVenta />} />
        <Route path="/caja" element={<Caja />} />
        <Route path="/ventas" element={<Ventas />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route
          path="/menu"
          element={
            <SoloJefatura>
              <Menu />
            </SoloJefatura>
          }
        />
        <Route
          path="/compras"
          element={
            <SoloJefatura>
              <Compras />
            </SoloJefatura>
          }
        />
        <Route
          path="/empleados"
          element={
            <SoloJefatura>
              <Empleados />
            </SoloJefatura>
          }
        />
        <Route
          path="/planilla"
          element={
            <SoloJefatura>
              <Planilla />
            </SoloJefatura>
          }
        />
        <Route
          path="/resumen"
          element={
            <SoloJefatura>
              <Resumen />
            </SoloJefatura>
          }
        />
        <Route
          path="/ajustes"
          element={
            <SoloJefatura soloAdmin>
              <Ajustes />
            </SoloJefatura>
          }
        />
        <Route path="*" element={<Navigate to={esJefatura ? '/resumen' : '/vender'} replace />} />
      </Route>
    </Routes>
  );
}
