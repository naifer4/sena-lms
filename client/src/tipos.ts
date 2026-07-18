// Tipos compartidos del frontend

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: 'instructor' | 'aprendiz';
}

export interface Curso {
  id: number;
  nombre: string;
  descripcion: string | null;
  ficha: string | null;
  instructorId: number;
  instructor?: { id?: number; nombre: string; correo?: string };
  competencias?: Competencia[];
  _count?: { competencias?: number; matriculas?: number };
}

export interface Competencia {
  id: number;
  cursoId: number;
  codigo: string;
  nombre: string;
  orden: number;
  curso?: { id: number; nombre: string };
  secciones?: Seccion[];
  actividades?: Actividad[];
  _count?: { actividades?: number };
}

export type TipoSeccion =
  | 'guias'
  | 'presentaciones'
  | 'material_apoyo'
  | 'instrumentos'
  | 'planes_sesion'
  | 'evidencias';

export interface Seccion {
  id: number;
  competenciaId: number;
  tipo: TipoSeccion;
  materiales: Material[];
}

export interface Material {
  id: number;
  seccionId: number;
  titulo: string;
  tipo: 'archivo' | 'enlace';
  archivoPath: string | null;
  url: string | null;
  creadoEn: string;
}

export interface Actividad {
  id: number;
  competenciaId: number;
  codigo: string;
  titulo: string;
  descripcion: string | null;
  evidencias?: Evidencia[];
  competencia?: {
    id: number;
    codigo: string;
    nombre: string;
    curso?: { id: number; nombre: string };
  };
}

export interface Evidencia {
  id: number;
  actividadId: number;
  aprendizId: number;
  titulo: string;
  url: string;
  comentario: string | null;
  creadoEn: string;
  estado: 'pendiente' | 'revisado';
  nota: number | null;
  retroalimentacion: string | null;
  aprendiz?: { id: number; nombre: string; correo?: string };
  actividad?: Actividad;
}

export interface Aprendiz {
  id: number;
  nombre: string;
  correo: string;
}

export interface Resumen {
  cursos: number;
  aprendices: number;
  entregasPendientes: number;
}

// Nombres visibles de las 6 secciones (carpetas)
export const NOMBRES_SECCION: Record<TipoSeccion, string> = {
  guias: 'Guías de aprendizaje',
  presentaciones: 'Presentaciones',
  material_apoyo: 'Material de apoyo',
  instrumentos: 'Instrumentos de evaluación',
  planes_sesion: 'Planes de sesión',
  evidencias: 'Evidencias de aprendices',
};

// En la etapa productiva (código 999999999) la sección 5 se llama "Proyectos"
export function nombreSeccion(tipo: TipoSeccion, codigoCompetencia?: string): string {
  if (tipo === 'planes_sesion' && codigoCompetencia === '999999999') return 'Proyectos';
  return NOMBRES_SECCION[tipo];
}

export const ORDEN_SECCIONES: TipoSeccion[] = [
  'guias',
  'presentaciones',
  'material_apoyo',
  'instrumentos',
  'planes_sesion',
  'evidencias',
];
