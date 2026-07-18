// Validaciones compartidas del backend

// Límite de cursos en toda la aplicación
export const MAX_CURSOS = 10;

// Límite de aprendices por curso
export const MAX_APRENDICES_POR_CURSO = 30;

// Tipos de sección válidos (las 6 carpetas de cada competencia)
export const TIPOS_SECCION = [
  'guias',
  'presentaciones',
  'material_apoyo',
  'instrumentos',
  'planes_sesion',
  'evidencias',
] as const;

// Resultado de error de las funciones de verificación de acceso
export interface ErrorAcceso {
  error: string;
  codigo: 400 | 403 | 404;
}

// Type guard: permite a TypeScript distinguir el caso de error del caso exitoso
export function esErrorAcceso(resultado: object): resultado is ErrorAcceso {
  return 'error' in resultado;
}

// Valida que una URL sea http o https
export function esUrlValida(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Valida formato básico de correo
export function esCorreoValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}
