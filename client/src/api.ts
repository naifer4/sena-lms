// Cliente HTTP: agrega el token JWT y maneja errores en español

const CLAVE_TOKEN = 'sena_lms_token';
const CLAVE_USUARIO = 'sena_lms_usuario';

export function guardarSesion(token: string, usuario: unknown) {
  localStorage.setItem(CLAVE_TOKEN, token);
  localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
}

export function limpiarSesion() {
  localStorage.removeItem(CLAVE_TOKEN);
  localStorage.removeItem(CLAVE_USUARIO);
}

export function obtenerToken(): string | null {
  return localStorage.getItem(CLAVE_TOKEN);
}

export function obtenerUsuarioGuardado<T>(): T | null {
  const crudo = localStorage.getItem(CLAVE_USUARIO);
  if (!crudo) return null;
  try {
    return JSON.parse(crudo) as T;
  } catch {
    return null;
  }
}

// Llamada a la API. Si "cuerpo" es FormData se envía tal cual (para archivos).
export async function api<T = unknown>(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown } = {},
): Promise<T> {
  const { metodo = 'GET', cuerpo } = opciones;
  const esFormData = cuerpo instanceof FormData;

  const cabeceras: Record<string, string> = {};
  const token = obtenerToken();
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo && !esFormData) cabeceras['Content-Type'] = 'application/json';

  const respuesta = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: cabeceras,
    body: cuerpo ? (esFormData ? (cuerpo as FormData) : JSON.stringify(cuerpo)) : undefined,
  });

  let datos: any = null;
  try {
    datos = await respuesta.json();
  } catch {
    // respuesta sin cuerpo JSON
  }

  if (!respuesta.ok) {
    // Sesión expirada: limpiar y volver al login
    if (respuesta.status === 401 && token) {
      limpiarSesion();
      window.location.href = '/login';
    }
    throw new Error(datos?.error ?? 'Ocurrió un error inesperado.');
  }
  return datos as T;
}
