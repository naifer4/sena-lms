import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import {
  Actividad,
  Competencia,
  Material,
  ORDEN_SECCIONES,
  Seccion,
  nombreSeccion,
} from '../tipos';
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

// Iconos sencillos por tipo de sección
const ICONOS_SECCION: Record<string, string> = {
  guias: '📘',
  presentaciones: '🖥️',
  material_apoyo: '📎',
  instrumentos: '📋',
  planes_sesion: '🗓️',
  evidencias: '🔗',
};

export default function CompetenciaDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const esInstructor = usuario!.rol === 'instructor';

  const [competencia, setCompetencia] = useState<Competencia | null>(null);
  const [error, setError] = useState('');

  async function cargar() {
    try {
      const datos = await api<{ competencia: Competencia }>(`/competencias/${id}`);
      setCompetencia(datos.competencia);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la competencia.');
    }
  }

  useEffect(() => {
    cargar();
  }, [id]);

  if (error) return <MensajeError mensaje={error} />;
  if (!competencia) return <Cargando />;

  const secciones = [...(competencia.secciones ?? [])].sort(
    (a, b) => ORDEN_SECCIONES.indexOf(a.tipo) - ORDEN_SECCIONES.indexOf(b.tipo),
  );
  const seccionesMateriales = secciones.filter((s) => s.tipo !== 'evidencias');

  return (
    <div className="space-y-5">
      <div>
        <Link to={`/cursos/${competencia.cursoId}`} className="text-sm text-sena-oscuro hover:underline">
          ← Volver a {competencia.curso?.nombre ?? 'el curso'}
        </Link>
        <div className="flex items-center gap-3 flex-wrap mt-2">
          <h1 className="text-2xl font-bold text-azul">{competencia.nombre}</h1>
          <Insignia color="celeste">Código {competencia.codigo}</Insignia>
        </div>
      </div>

      {/* Secciones 1-5: materiales */}
      <div className="grid md:grid-cols-2 gap-4">
        {seccionesMateriales.map((seccion) => (
          <TarjetaSeccion
            key={seccion.id}
            seccion={seccion}
            codigoCompetencia={competencia.codigo}
            esInstructor={esInstructor}
            recargar={cargar}
          />
        ))}
      </div>

      {/* Sección 6: actividades y evidencias */}
      <SeccionEvidencias competencia={competencia} esInstructor={esInstructor} recargar={cargar} />
    </div>
  );
}

// ---------- Tarjeta de una sección de materiales ----------
function TarjetaSeccion({
  seccion,
  codigoCompetencia,
  esInstructor,
  recargar,
}: {
  seccion: Seccion;
  codigoCompetencia: string;
  esInstructor: boolean;
  recargar: () => Promise<void>;
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [modo, setModo] = useState<'archivo' | 'enlace'>('archivo');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function agregar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const formulario = new FormData();
      formulario.set('titulo', titulo);
      if (modo === 'archivo') {
        if (!archivo) {
          setError('Selecciona un archivo.');
          setGuardando(false);
          return;
        }
        formulario.set('archivo', archivo);
      } else {
        formulario.set('url', url);
      }
      await api(`/secciones/${seccion.id}/materiales`, { metodo: 'POST', cuerpo: formulario });
      setTitulo('');
      setArchivo(null);
      setUrl('');
      setMostrarFormulario(false);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el material.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminar(material: Material) {
    if (!window.confirm(`¿Eliminar el material "${material.titulo}"?`)) return;
    try {
      await api(`/secciones/materiales/${material.id}`, { metodo: 'DELETE' });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  return (
    <Tarjeta className="p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="font-bold text-azul flex items-center gap-2">
          <span aria-hidden>{ICONOS_SECCION[seccion.tipo]}</span>
          {nombreSeccion(seccion.tipo, codigoCompetencia)}
        </h3>
        {esInstructor && (
          <Boton tipo="fantasma" onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            {mostrarFormulario ? 'Cancelar' : '+ Agregar'}
          </Boton>
        )}
      </div>

      {mostrarFormulario && (
        <form onSubmit={agregar} className="space-y-3 border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50">
          <Campo etiqueta="Título del material *">
            <input
              className={claseInput}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Guía de aprendizaje 01"
              required
            />
          </Campo>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={modo === 'archivo'}
                onChange={() => setModo('archivo')}
                className="accent-sena"
              />
              Archivo
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={modo === 'enlace'}
                onChange={() => setModo('enlace')}
                className="accent-sena"
              />
              Enlace
            </label>
          </div>
          {modo === 'archivo' ? (
            // La "key" evita que React reutilice el mismo input al cambiar de modo
            <Campo key="campo-archivo" etiqueta="Archivo (.docx, .pptx, .pdf, imágenes... máx. 25 MB)">
              <input
                type="file"
                className={claseInput}
                accept=".doc,.docx,.ppt,.pptx,.xls,.xlsx,.pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.zip"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              />
            </Campo>
          ) : (
            <Campo key="campo-enlace" etiqueta="URL (http/https)">
              <input
                type="url"
                className={claseInput}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </Campo>
          )}
          <MensajeError mensaje={error} />
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar material'}
          </Boton>
        </form>
      )}
      {!mostrarFormulario && <MensajeError mensaje={error} />}

      {seccion.materiales.length === 0 ? (
        <p className="text-sm text-gray-400">Sin materiales todavía.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {seccion.materiales.map((m) => (
            <li key={m.id} className="py-2 flex items-center gap-2">
              <span aria-hidden className="text-lg">
                {m.tipo === 'archivo' ? '📄' : '🌐'}
              </span>
              <a
                href={m.tipo === 'archivo' ? m.url ?? `/${m.archivoPath}` : m.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-sm font-medium text-azul hover:text-sena-oscuro hover:underline break-all"
              >
                {m.titulo}
              </a>
              {esInstructor && (
                <button
                  onClick={() => eliminar(m)}
                  className="text-xs text-red-600 hover:underline shrink-0"
                  aria-label={`Eliminar ${m.titulo}`}
                >
                  Eliminar
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Tarjeta>
  );
}

// ---------- Sección 6: Evidencias de aprendices ----------
function SeccionEvidencias({
  competencia,
  esInstructor,
  recargar,
}: {
  competencia: Competencia;
  esInstructor: boolean;
  recargar: () => Promise<void>;
}) {
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [codigo, setCodigo] = useState('AA_01');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const actividades = competencia.actividades ?? [];

  async function crearActividad(e: FormEvent) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await api(`/competencias/${competencia.id}/actividades`, {
        metodo: 'POST',
        cuerpo: { codigo, titulo, descripcion },
      });
      setTitulo('');
      setDescripcion('');
      setMostrarFormulario(false);
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la actividad.');
    } finally {
      setGuardando(false);
    }
  }

  async function eliminarActividad(a: Actividad) {
    if (!window.confirm(`¿Eliminar la actividad "${a.codigo} - ${a.titulo}" y sus evidencias?`)) return;
    try {
      await api(`/actividades/${a.id}`, { metodo: 'DELETE' });
      await recargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  }

  return (
    <Tarjeta className="p-5">
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <h3 className="font-bold text-azul flex items-center gap-2">
          <span aria-hidden>🔗</span>
          Evidencias de aprendices
        </h3>
        {esInstructor && (
          <Boton tipo="fantasma" onClick={() => setMostrarFormulario(!mostrarFormulario)}>
            {mostrarFormulario ? 'Cancelar' : '+ Crear actividad'}
          </Boton>
        )}
      </div>
      <p className="text-xs text-gray-500 mb-4">
        {esInstructor
          ? 'Define actividades (AA_01...AA_05) para que los aprendices entreguen la URL de su trabajo.'
          : 'Entrega tus evidencias registrando la URL donde está tu trabajo (GitHub, Drive, Netlify, etc.).'}
      </p>

      {mostrarFormulario && (
        <form onSubmit={crearActividad} className="space-y-3 border border-gray-200 rounded-lg p-3 mb-4 bg-gray-50">
          <div className="grid sm:grid-cols-[140px_1fr] gap-3">
            <Campo etiqueta="Código *">
              <select className={claseInput} value={codigo} onChange={(e) => setCodigo(e.target.value)}>
                {['AA_01', 'AA_02', 'AA_03', 'AA_04', 'AA_05'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Título *">
              <input
                className={claseInput}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Documento de requisitos"
                required
              />
            </Campo>
          </div>
          <Campo etiqueta="Descripción (opcional)">
            <textarea
              className={claseInput}
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Instrucciones para el aprendiz"
            />
          </Campo>
          <MensajeError mensaje={error} />
          <Boton type="submit" disabled={guardando}>
            {guardando ? 'Creando...' : 'Crear actividad'}
          </Boton>
        </form>
      )}
      {!mostrarFormulario && <MensajeError mensaje={error} />}

      {actividades.length === 0 ? (
        <p className="text-sm text-gray-400">
          {esInstructor
            ? 'Aún no has creado actividades en esta competencia.'
            : 'El instructor aún no ha definido actividades en esta competencia.'}
        </p>
      ) : (
        <div className="space-y-4">
          {actividades.map((actividad) => (
            <TarjetaActividad
              key={actividad.id}
              actividad={actividad}
              esInstructor={esInstructor}
              alCambiar={recargar}
              alEliminar={() => eliminarActividad(actividad)}
            />
          ))}
        </div>
      )}
    </Tarjeta>
  );
}

// ---------- Una actividad con sus evidencias / formulario de entrega ----------
function TarjetaActividad({
  actividad,
  esInstructor,
  alCambiar,
  alEliminar,
}: {
  actividad: Actividad;
  esInstructor: boolean;
  alCambiar: () => Promise<void>;
  alEliminar: () => void;
}) {
  const evidencias = actividad.evidencias ?? [];
  // Para el aprendiz, el backend solo envía SU evidencia
  const miEvidencia = !esInstructor ? evidencias[0] : undefined;

  const [entregando, setEntregando] = useState(false);
  const [titulo, setTitulo] = useState(miEvidencia?.titulo ?? '');
  const [url, setUrl] = useState(miEvidencia?.url ?? '');
  const [comentario, setComentario] = useState(miEvidencia?.comentario ?? '');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function entregar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setExito('');
    setGuardando(true);
    try {
      const datos = await api<{ mensaje: string }>(`/actividades/${actividad.id}/evidencias`, {
        metodo: 'POST',
        cuerpo: { titulo, url, comentario },
      });
      setExito(datos.mensaje);
      setEntregando(false);
      await alCambiar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entregar la evidencia.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-azul">
            <span className="text-sena-oscuro">{actividad.codigo}</span> · {actividad.titulo}
          </p>
          {actividad.descripcion && <p className="text-sm text-gray-600 mt-0.5">{actividad.descripcion}</p>}
        </div>
        {esInstructor && (
          <Boton tipo="peligro" onClick={alEliminar}>
            Eliminar
          </Boton>
        )}
      </div>

      {/* Vista del instructor: entregas recibidas */}
      {esInstructor && (
        <div className="mt-3">
          {evidencias.length === 0 ? (
            <p className="text-xs text-gray-400">Sin entregas todavía.</p>
          ) : (
            <ul className="space-y-1.5">
              {evidencias.map((ev) => (
                <li key={ev.id} className="text-sm flex items-center gap-2 flex-wrap">
                  <Insignia color={ev.estado === 'revisado' ? 'verde' : 'amarillo'}>
                    {ev.estado === 'revisado' ? 'Revisado' : 'Pendiente'}
                  </Insignia>
                  <span className="font-medium">{ev.aprendiz?.nombre}:</span>
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sena-oscuro hover:underline break-all"
                  >
                    {ev.url}
                  </a>
                  {ev.nota != null && <Insignia color="azul">Nota: {ev.nota}</Insignia>}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Para calificar, ve a la pestaña <strong>Evidencias</strong> del curso.
          </p>
        </div>
      )}

      {/* Vista del aprendiz: su entrega y formulario */}
      {!esInstructor && (
        <div className="mt-3 space-y-2">
          {miEvidencia && !entregando && (
            <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Insignia color={miEvidencia.estado === 'revisado' ? 'verde' : 'amarillo'}>
                  {miEvidencia.estado === 'revisado' ? 'Revisado' : 'Pendiente de revisión'}
                </Insignia>
                {miEvidencia.nota != null && <Insignia color="azul">Nota: {miEvidencia.nota}</Insignia>}
              </div>
              <p className="font-medium">{miEvidencia.titulo}</p>
              <a
                href={miEvidencia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sena-oscuro hover:underline break-all block"
              >
                🔗 {miEvidencia.url}
              </a>
              {miEvidencia.retroalimentacion && (
                <p className="text-gray-700 bg-celeste/20 border border-celeste/50 rounded-lg px-3 py-2">
                  <span className="font-semibold">Retroalimentación del instructor:</span>{' '}
                  {miEvidencia.retroalimentacion}
                </p>
              )}
            </div>
          )}
          <MensajeExito mensaje={exito} />

          {entregando ? (
            <form onSubmit={entregar} className="bg-white border border-gray-200 rounded-lg p-3 space-y-3">
              <Campo etiqueta="Título de tu evidencia *">
                <input
                  className={claseInput}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. Mi documento de requisitos"
                  required
                />
              </Campo>
              <Campo etiqueta="URL de tu trabajo * (GitHub, Drive, Netlify...)">
                <input
                  type="url"
                  className={claseInput}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://github.com/tu-usuario/tu-proyecto"
                  required
                />
              </Campo>
              <Campo etiqueta="Comentario (opcional)">
                <textarea
                  className={claseInput}
                  rows={2}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Mensaje para el instructor"
                />
              </Campo>
              <MensajeError mensaje={error} />
              <div className="flex gap-2">
                <Boton type="submit" disabled={guardando}>
                  {guardando ? 'Entregando...' : 'Entregar evidencia'}
                </Boton>
                <Boton type="button" tipo="fantasma" onClick={() => setEntregando(false)}>
                  Cancelar
                </Boton>
              </div>
            </form>
          ) : (
            <Boton onClick={() => setEntregando(true)}>
              {miEvidencia ? 'Volver a entregar (reemplaza la anterior)' : 'Entregar evidencia'}
            </Boton>
          )}
        </div>
      )}
    </div>
  );
}
