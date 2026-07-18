import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import { Aprendiz, Competencia, Curso, Evidencia } from '../tipos';
import {
  Boton,
  Campo,
  Cargando,
  claseInput,
  Insignia,
  MensajeError,
  MensajeExito,
  Tarjeta,
} from '../componentes/ui';

const MAX_APRENDICES = 30;

type Pestana = 'competencias' | 'aprendices' | 'evidencias';

export default function CursoDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const esInstructor = usuario!.rol === 'instructor';

  const [curso, setCurso] = useState<Curso | null>(null);
  const [error, setError] = useState('');
  const [pestana, setPestana] = useState<Pestana>('competencias');

  async function cargar() {
    try {
      const datos = await api<{ curso: Curso }>(`/cursos/${id}`);
      setCurso(datos.curso);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el curso.');
    }
  }

  useEffect(() => {
    cargar();
  }, [id]);

  if (error) return <MensajeError mensaje={error} />;
  if (!curso) return <Cargando />;

  const pestanas: { clave: Pestana; texto: string }[] = esInstructor
    ? [
        { clave: 'competencias', texto: 'Competencias' },
        { clave: 'aprendices', texto: 'Aprendices' },
        { clave: 'evidencias', texto: 'Evidencias' },
      ]
    : [{ clave: 'competencias', texto: 'Competencias' }];

  return (
    <div className="space-y-5">
      {/* Encabezado del curso */}
      <div>
        <Link to="/" className="text-sm text-sena-oscuro hover:underline">
          ← Volver al inicio
        </Link>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <h1 className="text-2xl font-bold text-azul">{curso.nombre}</h1>
          {curso.ficha && <Insignia color="celeste">Ficha {curso.ficha}</Insignia>}
        </div>
        {curso.descripcion && <p className="text-gray-600 text-sm mt-1">{curso.descripcion}</p>}
        {!esInstructor && curso.instructor && (
          <p className="text-xs text-gray-500 mt-1">Instructor: {curso.instructor.nombre}</p>
        )}
      </div>

      {/* Pestañas */}
      {pestanas.length > 1 && (
        <div className="flex gap-1 border-b border-gray-300 overflow-x-auto">
          {pestanas.map((p) => (
            <button
              key={p.clave}
              onClick={() => setPestana(p.clave)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg whitespace-nowrap transition-colors ${
                pestana === p.clave
                  ? 'bg-sena text-white'
                  : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.texto}
            </button>
          ))}
        </div>
      )}

      {pestana === 'competencias' && (
        <PestanaCompetencias curso={curso} esInstructor={esInstructor} recargar={cargar} />
      )}
      {pestana === 'aprendices' && esInstructor && <PestanaAprendices cursoId={curso.id} />}
      {pestana === 'evidencias' && esInstructor && (
        <PestanaEvidencias cursoId={curso.id} competencias={curso.competencias ?? []} />
      )}
    </div>
  );
}

// ---------- Pestaña: Competencias ----------
function PestanaCompetencias({
  curso,
  esInstructor,
  recargar,
}: {
  curso: Curso;
  esInstructor: boolean;
  recargar: () => Promise<void>;
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [editando, setEditando] = useState<Competencia | null>(null);
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [errorFormulario, setErrorFormulario] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const competencias = curso.competencias ?? [];

  function abrirCrear() {
    setEditando(null);
    setCodigo('');
    setNombre('');
    setErrorFormulario('');
    setMostrarFormulario(true);
  }

  function abrirEditar(c: Competencia) {
    setEditando(c);
    setCodigo(c.codigo);
    setNombre(c.nombre);
    setErrorFormulario('');
    setMostrarFormulario(true);
  }

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setErrorFormulario('');
    setGuardando(true);
    try {
      if (editando) {
        await api(`/competencias/${editando.id}`, { metodo: 'PUT', cuerpo: { codigo, nombre } });
      } else {
        await api(`/cursos/${curso.id}/competencias`, { metodo: 'POST', cuerpo: { codigo, nombre } });
      }
      setMostrarFormulario(false);
      await recargar();
    } catch (err) {
      setErrorFormulario(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(c: Competencia) {
    const confirmado = window.confirm(
      `¿Eliminar la competencia "${c.codigo} - ${c.nombre}"? Se borrarán sus materiales y evidencias.`,
    );
    if (!confirmado) return;
    try {
      await api(`/competencias/${c.id}`, { metodo: 'DELETE' });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  return (
    <div className="space-y-4">
      <MensajeError mensaje={error} />
      {esInstructor && (
        <div className="flex justify-end">
          <Boton onClick={abrirCrear}>+ Agregar competencia</Boton>
        </div>
      )}

      {mostrarFormulario && (
        <Tarjeta className="p-5">
          <h3 className="font-bold text-azul mb-3">
            {editando ? 'Editar competencia' : 'Nueva competencia'}
          </h3>
          <form onSubmit={guardar} className="space-y-3">
            <div className="grid sm:grid-cols-[180px_1fr] gap-3">
              <Campo etiqueta="Código *">
                <input
                  className={claseInput}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Ej. 220501092"
                  required
                />
              </Campo>
              <Campo etiqueta="Nombre *">
                <input
                  className={claseInput}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre de la competencia"
                  required
                />
              </Campo>
            </div>
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

      {competencias.length === 0 ? (
        <Tarjeta className="p-8 text-center text-gray-500">
          Este curso aún no tiene competencias.
        </Tarjeta>
      ) : (
        <div className="space-y-2">
          {competencias.map((c) => (
            <Tarjeta key={c.id} className="p-4 flex items-center gap-3 flex-wrap hover:shadow-md transition-shadow">
              <span className="w-9 h-9 shrink-0 rounded-full bg-sena text-white text-sm font-bold flex items-center justify-center">
                {c.orden}
              </span>
              <div className="flex-1 min-w-[200px]">
                <Link
                  to={`/competencias/${c.id}`}
                  className="font-semibold text-azul hover:text-sena-oscuro"
                >
                  {c.nombre}
                </Link>
                <p className="text-xs text-gray-500">
                  Código {c.codigo} · {c._count?.actividades ?? 0} actividades
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/competencias/${c.id}`}>
                  <Boton tipo="secundario">Abrir</Boton>
                </Link>
                {esInstructor && (
                  <>
                    <Boton tipo="fantasma" onClick={() => abrirEditar(c)}>
                      Editar
                    </Boton>
                    <Boton tipo="peligro" onClick={() => eliminar(c)}>
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

// ---------- Pestaña: Aprendices ----------
function PestanaAprendices({ cursoId }: { cursoId: number }) {
  const [aprendices, setAprendices] = useState<Aprendiz[] | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function cargar() {
    try {
      const datos = await api<{ aprendices: Aprendiz[] }>(`/cursos/${cursoId}/aprendices`);
      setAprendices(datos.aprendices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los aprendices.');
    }
  }

  useEffect(() => {
    cargar();
  }, [cursoId]);

  async function matricular(e: FormEvent) {
    e.preventDefault();
    setError('');
    setExito('');
    setGuardando(true);
    try {
      const datos = await api<{ mensaje: string }>(`/cursos/${cursoId}/aprendices`, {
        metodo: 'POST',
        cuerpo: { nombre, correo, password },
      });
      setExito(datos.mensaje);
      setNombre('');
      setCorreo('');
      setPassword('');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo matricular.');
    } finally {
      setGuardando(false);
    }
  }

  async function retirar(a: Aprendiz) {
    if (!window.confirm(`¿Retirar a ${a.nombre} del curso?`)) return;
    setError('');
    setExito('');
    try {
      await api(`/cursos/${cursoId}/aprendices/${a.id}`, { metodo: 'DELETE' });
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo retirar al aprendiz.');
    }
  }

  if (!aprendices) return <Cargando />;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
      <Tarjeta className="p-5">
        <h3 className="font-bold text-azul mb-3">
          Aprendices matriculados ({aprendices.length}/{MAX_APRENDICES})
        </h3>
        {aprendices.length >= MAX_APRENDICES && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-3">
            El curso alcanzó el máximo de {MAX_APRENDICES} aprendices.
          </p>
        )}
        {aprendices.length === 0 ? (
          <p className="text-gray-500 text-sm">Aún no hay aprendices matriculados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {aprendices.map((a) => (
              <li key={a.id} className="py-2.5 flex items-center gap-3 flex-wrap">
                <div className="w-9 h-9 shrink-0 rounded-full bg-celeste/50 text-azul font-bold text-sm flex items-center justify-center">
                  {a.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-gray-800">{a.nombre}</p>
                  <p className="text-xs text-gray-500">{a.correo}</p>
                </div>
                <Boton tipo="peligro" onClick={() => retirar(a)}>
                  Retirar
                </Boton>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta className="p-5">
        <h3 className="font-bold text-azul mb-1">Matricular aprendiz</h3>
        <p className="text-xs text-gray-500 mb-3">
          Si el correo no tiene cuenta, se creará una nueva cuenta de aprendiz.
        </p>
        <form onSubmit={matricular} className="space-y-3">
          <Campo etiqueta="Nombre completo">
            <input
              className={claseInput}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del aprendiz"
            />
          </Campo>
          <Campo etiqueta="Correo electrónico *">
            <input
              type="email"
              className={claseInput}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              required
            />
          </Campo>
          <Campo etiqueta="Contraseña inicial (opcional)">
            <input
              className={claseInput}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Si se deja vacía: Sena2026*"
            />
          </Campo>
          <MensajeError mensaje={error} />
          <MensajeExito mensaje={exito} />
          <Boton type="submit" disabled={guardando || aprendices.length >= MAX_APRENDICES} className="w-full">
            {guardando ? 'Matriculando...' : 'Matricular'}
          </Boton>
        </form>
      </Tarjeta>
    </div>
  );
}

// ---------- Pestaña: Evidencias (instructor) ----------
function PestanaEvidencias({
  cursoId,
  competencias,
}: {
  cursoId: number;
  competencias: Competencia[];
}) {
  const [evidencias, setEvidencias] = useState<Evidencia[] | null>(null);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroCompetencia, setFiltroCompetencia] = useState('');

  async function cargar() {
    try {
      const parametros = new URLSearchParams();
      if (filtroEstado) parametros.set('estado', filtroEstado);
      if (filtroCompetencia) parametros.set('competenciaId', filtroCompetencia);
      const datos = await api<{ evidencias: Evidencia[] }>(
        `/cursos/${cursoId}/evidencias?${parametros.toString()}`,
      );
      setEvidencias(datos.evidencias);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las evidencias.');
    }
  }

  useEffect(() => {
    cargar();
  }, [cursoId, filtroEstado, filtroCompetencia]);

  return (
    <div className="space-y-4">
      <MensajeError mensaje={error} />

      {/* Filtros */}
      <Tarjeta className="p-4 flex gap-3 flex-wrap items-end">
        <Campo etiqueta="Estado">
          <select className={claseInput} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="revisado">Revisado</option>
          </select>
        </Campo>
        <Campo etiqueta="Competencia">
          <select
            className={claseInput}
            value={filtroCompetencia}
            onChange={(e) => setFiltroCompetencia(e.target.value)}
          >
            <option value="">Todas</option>
            {competencias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.codigo} - {c.nombre}
              </option>
            ))}
          </select>
        </Campo>
      </Tarjeta>

      {!evidencias ? (
        <Cargando />
      ) : evidencias.length === 0 ? (
        <Tarjeta className="p-8 text-center text-gray-500">
          No hay evidencias con los filtros seleccionados.
        </Tarjeta>
      ) : (
        <div className="space-y-3">
          {evidencias.map((ev) => (
            <TarjetaEvidencia key={ev.id} evidencia={ev} alCalificar={cargar} />
          ))}
        </div>
      )}
    </div>
  );
}

// Tarjeta de una evidencia con formulario de calificación
function TarjetaEvidencia({
  evidencia,
  alCalificar,
}: {
  evidencia: Evidencia;
  alCalificar: () => Promise<void>;
}) {
  const [calificando, setCalificando] = useState(false);
  const [nota, setNota] = useState(evidencia.nota?.toString() ?? '');
  const [retro, setRetro] = useState(evidencia.retroalimentacion ?? '');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api(`/evidencias/${evidencia.id}/calificar`, {
        metodo: 'PUT',
        cuerpo: { estado: 'revisado', nota, retroalimentacion: retro },
      });
      setCalificando(false);
      await alCalificar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo calificar.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Tarjeta className="p-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-azul">{evidencia.titulo}</p>
            <Insignia color={evidencia.estado === 'revisado' ? 'verde' : 'amarillo'}>
              {evidencia.estado === 'revisado' ? 'Revisado' : 'Pendiente'}
            </Insignia>
            {evidencia.nota != null && <Insignia color="azul">Nota: {evidencia.nota}</Insignia>}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {evidencia.aprendiz?.nombre} · {evidencia.actividad?.codigo} {evidencia.actividad?.titulo}
            {evidencia.actividad?.competencia &&
              ` · Competencia ${evidencia.actividad.competencia.codigo}`}
          </p>
          <a
            href={evidencia.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-sena-oscuro font-medium hover:underline break-all"
          >
            🔗 {evidencia.url}
          </a>
          {evidencia.comentario && (
            <p className="text-sm text-gray-600 mt-1 italic">"{evidencia.comentario}"</p>
          )}
          {evidencia.retroalimentacion && !calificando && (
            <p className="text-sm text-gray-700 mt-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <span className="font-semibold">Retroalimentación:</span> {evidencia.retroalimentacion}
            </p>
          )}
        </div>
        <Boton tipo={evidencia.estado === 'pendiente' ? 'primario' : 'fantasma'} onClick={() => setCalificando(!calificando)}>
          {calificando ? 'Cerrar' : evidencia.estado === 'pendiente' ? 'Calificar' : 'Editar calificación'}
        </Boton>
      </div>

      {calificando && (
        <form onSubmit={guardar} className="border-t border-gray-100 pt-3 space-y-3">
          <div className="grid sm:grid-cols-[140px_1fr] gap-3">
            <Campo etiqueta="Nota (0.0 a 5.0)">
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                className={claseInput}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej. 4.5"
              />
            </Campo>
            <Campo etiqueta="Retroalimentación">
              <textarea
                className={claseInput}
                rows={2}
                value={retro}
                onChange={(e) => setRetro(e.target.value)}
                placeholder="Comentarios para el aprendiz"
              />
            </Campo>
          </div>
          <MensajeError mensaje={error} />
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar calificación (marcar como revisado)'}
          </Boton>
        </form>
      )}
    </Tarjeta>
  );
}
