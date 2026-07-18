import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { Boton, Campo, claseInput, MensajeError, Tarjeta } from '../componentes/ui';

export default function Registro() {
  const { registrarse } = useAuth();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setCargando(true);
    try {
      await registrarse(nombre, correo, password, codigo);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen bg-azul flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Tarjeta className="p-6 sm:p-8">
          <h2 className="text-xl font-bold text-azul mb-1">Registro de instructor</h2>
          <p className="text-sm text-gray-600 mb-4">
            Crea tu cuenta de instructor para gestionar cursos. Las cuentas de aprendiz las crea el
            instructor al matricular.
          </p>
          <form onSubmit={enviar} className="space-y-4">
            <Campo etiqueta="Nombre completo">
              <input
                className={claseInput}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Naifer David Blanco Vacca"
                required
                autoFocus
              />
            </Campo>
            <Campo etiqueta="Correo electrónico">
              <input
                type="email"
                className={claseInput}
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
              />
            </Campo>
            <Campo etiqueta="Contraseña (mínimo 6 caracteres)">
              <input
                type="password"
                className={claseInput}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </Campo>
            <Campo etiqueta="Confirmar contraseña">
              <input
                type="password"
                className={claseInput}
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                minLength={6}
                required
              />
            </Campo>
            <Campo etiqueta="Código de registro (solo si la plataforma lo exige)">
              <input
                className={claseInput}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Déjalo vacío si no te dieron un código"
              />
            </Campo>
            <MensajeError mensaje={error} />
            <Boton type="submit" disabled={cargando} className="w-full">
              {cargando ? 'Creando cuenta...' : 'Crear cuenta de instructor'}
            </Boton>
          </form>
          <p className="text-sm text-gray-600 mt-4 text-center">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-sena-oscuro font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </Tarjeta>
      </div>
    </div>
  );
}
