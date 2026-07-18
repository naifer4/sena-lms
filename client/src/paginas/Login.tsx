import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Boton, Campo, claseInput, MensajeError, Tarjeta } from '../componentes/ui';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await iniciarSesion(correo, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-azul flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center shadow-lg">
            <img src="/logo-sena.svg" alt="Logo del SENA" className="w-[70px] h-[70px]" />
          </div>
          <h1 className="text-white text-2xl font-bold mt-4">SENA LMS</h1>
          <p className="text-celeste text-sm">Plataforma de cursos y evidencias</p>
        </div>

        <Tarjeta className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-azul mb-4">Iniciar sesión</h2>
          <form onSubmit={enviar} className="space-y-4">
            <Campo etiqueta="Correo electrónico">
              <input
                type="email"
                className={claseInput}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
                autoFocus
              />
            </Campo>
            <Campo etiqueta="Contraseña">
              <input
                type="password"
                className={claseInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
              />
            </Campo>
            <MensajeError mensaje={error} />
            <Boton type="submit" disabled={cargando} className="w-full">
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </Boton>
          </form>
          <p className="text-sm text-gray-600 mt-4 text-center">
            ¿Eres instructor y no tienes cuenta?{' '}
            <Link to="/registro" className="text-sena-oscuro font-semibold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </Tarjeta>
      </div>
    </div>
  );
}
