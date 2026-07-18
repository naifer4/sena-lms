import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import Layout from './componentes/Layout';
import Login from './paginas/Login';
import Registro from './paginas/Registro';
import Panel from './paginas/Panel';
import CursoDetalle from './paginas/CursoDetalle';
import CompetenciaDetalle from './paginas/CompetenciaDetalle';
import MisEntregas from './paginas/MisEntregas';
import { ReactNode } from 'react';

// Envuelve las rutas que exigen sesión iniciada
function RutaPrivada({ children }: { children: ReactNode }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/registro" element={usuario ? <Navigate to="/" replace /> : <Registro />} />
      <Route
        path="/"
        element={
          <RutaPrivada>
            <Panel />
          </RutaPrivada>
        }
      />
      <Route
        path="/cursos/:id"
        element={
          <RutaPrivada>
            <CursoDetalle />
          </RutaPrivada>
        }
      />
      <Route
        path="/competencias/:id"
        element={
          <RutaPrivada>
            <CompetenciaDetalle />
          </RutaPrivada>
        }
      />
      <Route
        path="/entregas"
        element={
          <RutaPrivada>
            <MisEntregas />
          </RutaPrivada>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
