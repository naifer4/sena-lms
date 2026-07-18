import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Insignia } from './ui';

// Barra de navegación superior con la identidad del SENA y área de contenido
export default function Layout({ children }: { children: ReactNode }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  function salir() {
    cerrarSesion();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-azul text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4 flex-wrap">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm">
              <img src="/logo-sena.svg" alt="Logo del SENA" className="w-8 h-8" />
            </div>
            <div>
              <span className="block font-bold text-lg leading-tight">SENA LMS</span>
              <span className="block text-xs text-celeste">Plataforma de cursos y evidencias</span>
            </div>
          </Link>

          {usuario && (
            <>
              {/* Botón de menú en móvil */}
              <button
                className="ml-auto sm:hidden p-2 rounded-lg hover:bg-white/10"
                onClick={() => setMenuAbierto(!menuAbierto)}
                aria-label="Abrir menú"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
                </svg>
              </button>

              <nav
                className={`${menuAbierto ? 'flex' : 'hidden'} sm:flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 w-full sm:w-auto sm:ml-auto`}
              >
                <Link to="/" className="text-sm font-medium hover:text-celeste py-1">
                  Inicio
                </Link>
                {usuario.rol === 'aprendiz' && (
                  <Link to="/entregas" className="text-sm font-medium hover:text-celeste py-1">
                    Mis entregas
                  </Link>
                )}
                <div className="flex items-center gap-2 sm:border-l sm:border-white/20 sm:pl-4">
                  <div className="text-right sm:text-left">
                    <span className="block text-sm font-semibold leading-tight">{usuario.nombre}</span>
                    <Insignia color={usuario.rol === 'instructor' ? 'celeste' : 'gris'}>
                      {usuario.rol === 'instructor' ? 'Instructor' : 'Aprendiz'}
                    </Insignia>
                  </div>
                  <button
                    onClick={salir}
                    className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg font-medium ml-2"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </nav>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>

      <footer className="bg-azul text-celeste text-xs text-center py-3 mt-8">
        SENA — Servicio Nacional de Aprendizaje · Plataforma de apoyo a la formación
      </footer>
    </div>
  );
}
