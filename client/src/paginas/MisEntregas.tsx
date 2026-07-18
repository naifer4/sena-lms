import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Evidencia } from '../tipos';
import { Cargando, Insignia, MensajeError, Tarjeta } from '../componentes/ui';

// Página del aprendiz: todas sus entregas con estado, nota y retroalimentación
export default function MisEntregas() {
  const [evidencias, setEvidencias] = useState<Evidencia[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ evidencias: Evidencia[] }>('/evidencias/mias')
      .then((datos) => setEvidencias(datos.evidencias))
      .catch((err) => setError(err instanceof Error ? err.message : 'No se pudieron cargar tus entregas.'));
  }, []);

  if (error) return <MensajeError mensaje={error} />;
  if (!evidencias) return <Cargando />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-azul">Mis entregas</h1>
        <p className="text-gray-600 text-sm mt-1">
          Aquí ves el estado, la nota y la retroalimentación de todas tus evidencias.
        </p>
      </div>

      {evidencias.length === 0 ? (
        <Tarjeta className="p-8 text-center text-gray-500">
          Aún no has entregado evidencias. Entra a un curso, abre una competencia y entrega la URL de
          tu trabajo.
        </Tarjeta>
      ) : (
        <div className="space-y-3">
          {evidencias.map((ev) => (
            <Tarjeta key={ev.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-azul">{ev.titulo}</p>
                <Insignia color={ev.estado === 'revisado' ? 'verde' : 'amarillo'}>
                  {ev.estado === 'revisado' ? 'Revisado' : 'Pendiente de revisión'}
                </Insignia>
                {ev.nota != null && <Insignia color="azul">Nota: {ev.nota}</Insignia>}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {ev.actividad?.competencia?.curso && (
                  <>
                    {ev.actividad.competencia.curso.nombre} ·{' '}
                  </>
                )}
                {ev.actividad?.competencia && (
                  <Link to={`/competencias/${ev.actividad.competencia.id}`} className="hover:underline">
                    Competencia {ev.actividad.competencia.codigo}
                  </Link>
                )}{' '}
                · {ev.actividad?.codigo} {ev.actividad?.titulo}
              </p>
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sena-oscuro font-medium hover:underline break-all"
              >
                🔗 {ev.url}
              </a>
              {ev.retroalimentacion && (
                <p className="text-sm text-gray-700 mt-2 bg-celeste/20 border border-celeste/50 rounded-lg px-3 py-2">
                  <span className="font-semibold">Retroalimentación:</span> {ev.retroalimentacion}
                </p>
              )}
            </Tarjeta>
          ))}
        </div>
      )}
    </div>
  );
}
