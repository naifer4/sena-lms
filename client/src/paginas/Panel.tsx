import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Curso, Resumen } from '../tipos';
import {
  Boton,
  Campo,
  Cargando,
  claseInput,
  Insignia,
  MensajeError,
  Tarjeta,
} from '../componentes/ui';

const MAX_CURSOS = 10;

export default function Panel() {
  const { usuario } = useAuth();
  const esInstructor = usuario!.rol === 'instructor';

  const [cursos, setCursos] = useState<Curso[] | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState('');

  // Formulario de curso (crear o editar)
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Curso | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [ficha, setFicha] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const datos = await api<{ cursos: Curso[] }>('/cursos');
      setCursos(datos.cursos);
      if (esInstructor) {
        const r = await api<{ resumen: Resumen }>('/resumen');
        setResumen(r.resumen);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los cursos.');
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  function abrirCrear() {
    setEditando(null);
    setNombre('');
    setDescripcion('');
    setFicha('');
    setErrorFormulario('');
    setMostrarFormulario(true);
  }

  function abrirEditar(curso: Curso) {
    setEditando(curso);
    setNombre(curso.nombre);
    setDescripcion(curso.descripcion ?? '');
    setFicha(curso.ficha ?? '');
    setErrorFormulario('');
    setMostrarFormulario(true);
  }

  async function guardarCurso(e: FormEvent) {
    e.preventDefault();
    setErrorFormulario('');
    setGuardando(true);
    try {
      if (editando) {
        await api(`/cursos/${editando.id}`, {
          metodo: 'PUT',
          cuerpo: { nombre, descripcion, ficha },
        });
      } else {
        await api('/cursos', { metodo: 'POST', cuerpo: { nombre, descripcion, ficha } });
      }
      setMostrarFormulario(false);
      await cargar();
    } catch (err) {
      setErrorFormulario(err instanceof Error ? err.message : 'No se pudo guardar el curso.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarCurso(curso: Curso) {
    const confirmado = window.confirm(
      `¿Eliminar el curso "${curso.nombre}"? Se borrarán sus competencias, materiales y evidencias.`,
    );
    if (!confirmado) return;
    try {
      await api(`/cursos/${curso.id}`, { metodo: 'DELETE' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el curso.');
    }
  }

  if (!cursos) return <Cargando />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-azul">
          {esInstructor ? 'Panel del instructor' : 'Mis cursos'}
        </h1>
        <p className="text-gray-600 text-sm mt-1">Bienvenido(a), {usuario!.nombre}.</p>
      </div>

      <MensajeError mensaje={error} />

      {/* Resumen del instructor */}
      {esInstructor && resumen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Tarjeta className="p-5 border-l-4 border-l-sena">
            <p className="text-3xl font-extrabold text-azul">
              {resumen.cursos}
              <span className="text-base font-medium text-gray-400"> / {MAX_CURSOS}</span>
            </p>
            <p className="text-sm text-gray-600 font-medium">Cursos creados</p>
          </Tarjeta>
          <Tarjeta className="p-5 border-l-4 border-l-celeste">
            <p className="text-3xl font-extrabold text-azul">{resumen.aprendices}</p>
            <p className="text-sm text-gray-600 font-medium">Aprendices matriculados</p>
          </Tarjeta>
          <Tarjeta className="p-5 border-l-4 border-l-amber-400">
            <p className="text-3xl font-extrabold text-azul">{resumen.entregasPendientes}</p>
            <p className="text-sm text-gray-600 font-medium">Entregas pendientes por revisar</p>
          </Tarjeta>
        </div>
      )}

      {/* Encabezado de la lista de cursos */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-azul">
          {esInstructor ? `Mis cursos (${cursos.length}/${MAX_CURSOS})` : 'Cursos en los que estás matriculado'}
        </h2>
        {esInstructor && (
          <Boton onClick={abrirCrear} disabled={cursos.length >= MAX_CURSOS}>
            + Crear curso
          </Boton>
        )}
      </div>

      {esInstructor && cursos.length >= MAX_CURSOS && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
          Has alcanzado el máximo de {MAX_CURSOS} cursos. Elimina uno si necesitas crear otro.
        </p>
      )}

      {/* Formulario crear/editar curso */}
      {mostrarFormulario && (
        <Tarjeta className="p-5">
          <h3 className="font-bold text-azul mb-3">{editando ? 'Editar curso' : 'Nuevo curso'}</h3>
          <form onSubmit={guardarCurso} className="space-y-3">
            <Campo etiqueta="Nombre del curso *">
              <input
                className={claseInput}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Técnico en Programación de Software"
                required
              />
            </Campo>
            <div className="grid sm:grid-cols-2 gap-3">
              <Campo etiqueta="Ficha (opcional)">
                <input
                  className={claseInput}
                  value={ficha}
                  onChange={(e) => setFicha(e.target.value)}
                  placeholder="Ej. 233104"
                />
              </Campo>
            </div>
            <Campo etiqueta="Descripción (opcional)">
              <textarea
                className={claseInput}
                rows={2}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripción del curso"
              />
            </Campo>
            <MensajeError mensaje={errorFormulario} />
            <div className="flex gap-2">
              <Boton type="submit" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </Boton>
              <Boton type="button" tipo="fantasma" onClick={() => setMostrarFormulario(false)}>
                Cancelar
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}

      {/* Tarjetas de cursos */}
      {cursos.length === 0 ? (
        <Tarjeta className="p-8 text-center text-gray-500">
          {esInstructor
            ? 'Aún no has creado cursos. Usa el botón "Crear curso" para comenzar.'
            : 'Aún no estás matriculado en ningún curso. Pídele a tu instructor que te matricule.'}
        </Tarjeta>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursos.map((curso) => (
            <Tarjeta key={curso.id} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/cursos/${curso.id}`} className="font-bold text-azul hover:text-sena-oscuro leading-snug">
                  {curso.nombre}
                </Link>
                {curso.ficha && <Insignia color="celeste">Ficha {curso.ficha}</Insignia>}
              </div>
              {curso.descripcion && (
                <p className="text-sm text-gray-600 line-clamp-3">{curso.descripcion}</p>
              )}
              {!esInstructor && curso.instructor && (
                <p className="text-xs text-gray-500">Instructor: {curso.instructor.nombre}</p>
              )}
              <div className="flex gap-3 text-xs text-gray-500 mt-auto">
                <span>{curso._count?.competencias ?? 0} competencias</span>
                {esInstructor && <span>{curso._count?.matriculas ?? 0}/30 aprendices</span>}
              </div>
              <div className="flex gap-2 pt-1">
                <Link to={`/cursos/${curso.id}`} className="flex-1">
                  <Boton className="w-full">Abrir</Boton>
                </Link>
                {esInstructor && (
                  <>
                    <Boton tipo="fantasma" onClick={() => abrirEditar(curso)}>
                      Editar
                    </Boton>
                    <Boton tipo="peligro" onClick={() => eliminarCurso(curso)}>
                      Eliminar
                    </Boton>
                  </>
                )}
              </div>
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}
