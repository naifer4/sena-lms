import { createContext, useContext, useState, ReactNode } from 'react';
import { Usuario } from './tipos';
import { api, guardarSesion, limpiarSesion, obtenerUsuarioGuardado } from './api';

interface ContextoAuth {
  usuario: Usuario | null;
  iniciarSesion: (correo: string, password: string) => Promise<Usuario>;
  registrarse: (nombre: string, correo: string, password: string, codigo?: string) => Promise<Usuario>;
  cerrarSesion: () => void;
}

const AuthContext = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(() => obtenerUsuarioGuardado<Usuario>());

  async function iniciarSesion(correo: string, password: string) {
    const datos = await api<{ token: string; usuario: Usuario }>('/auth/login', {
      metodo: 'POST',
      cuerpo: { correo, password },
    });
    guardarSesion(datos.token, datos.usuario);
    setUsuario(datos.usuario);
    return datos.usuario;
  }

  async function registrarse(nombre: string, correo: string, password: string, codigo?: string) {
    const datos = await api<{ token: string; usuario: Usuario }>('/auth/registro', {
      metodo: 'POST',
      cuerpo: { nombre, correo, password, codigo },
    });
    guardarSesion(datos.token, datos.usuario);
    setUsuario(datos.usuario);
    return datos.usuario;
  }

  function cerrarSesion() {
    limpiarSesion();
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, iniciarSesion, registrarse, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return contexto;
}
