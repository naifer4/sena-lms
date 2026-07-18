import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requiereSesion, requiereInstructor, requiereAprendiz } from '../middleware/auth';
import { esErrorAcceso, esUrlValida } from '../lib/validaciones';

const router = Router();
router.use(requiereSesion);

// Comprueba que la actividad pertenezca a un curso del instructor
async function actividadDelInstructor(actividadId: number, instructorId: number) {
  const actividad = await prisma.actividad.findUnique({
    where: { id: actividadId },
    include: { competencia: { include: { curso: true } } },
  });
  if (!actividad) return { error: 'La actividad no existe.', codigo: 404 as const };
  if (actividad.competencia.curso.instructorId !== instructorId) {
    return { error: 'No puedes gestionar cursos de otro instructor.', codigo: 403 as const };
  }
  return { actividad };
}

// PUT /api/actividades/:id — editar actividad
router.put('/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await actividadDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { codigo, titulo, descripcion } = req.body ?? {};
  if (!codigo?.trim() || !titulo?.trim()) {
    return res.status(400).json({ error: 'El código y el título son obligatorios.' });
  }
  const actividad = await prisma.actividad.update({
    where: { id },
    data: {
      codigo: codigo.trim(),
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
    },
  });
  res.json({ actividad });
});

// DELETE /api/actividades/:id — eliminar actividad
router.delete('/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await actividadDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  await prisma.actividad.delete({ where: { id } });
  res.json({ mensaje: 'Actividad eliminada correctamente.' });
});

// POST /api/actividades/:id/evidencias — el aprendiz entrega su evidencia (URL)
router.post('/:id/evidencias', requiereAprendiz, async (req, res) => {
  const id = Number(req.params.id);
  const actividad = await prisma.actividad.findUnique({
    where: { id },
    include: { competencia: true },
  });
  if (!actividad) return res.status(404).json({ error: 'La actividad no existe.' });

  // El aprendiz debe estar matriculado en el curso de la actividad
  const matricula = await prisma.matricula.findUnique({
    where: {
      cursoId_aprendizId: {
        cursoId: actividad.competencia.cursoId,
        aprendizId: req.usuario!.id,
      },
    },
  });
  if (!matricula) return res.status(403).json({ error: 'No estás matriculado en este curso.' });

  const { titulo, url, comentario } = req.body ?? {};
  if (!titulo?.trim()) return res.status(400).json({ error: 'El título de la evidencia es obligatorio.' });
  if (!url?.trim() || !esUrlValida(url.trim())) {
    return res.status(400).json({
      error: 'La evidencia debe ser una URL válida que empiece por http:// o https:// (ej. https://github.com/usuario/proyecto).',
    });
  }

  // Si ya entregó, se actualiza la entrega y vuelve a estado "pendiente"
  const evidencia = await prisma.evidencia.upsert({
    where: { actividadId_aprendizId: { actividadId: id, aprendizId: req.usuario!.id } },
    update: {
      titulo: titulo.trim(),
      url: url.trim(),
      comentario: comentario?.trim() || null,
      estado: 'pendiente',
      nota: null,
      retroalimentacion: null,
      creadoEn: new Date(),
    },
    create: {
      actividadId: id,
      aprendizId: req.usuario!.id,
      titulo: titulo.trim(),
      url: url.trim(),
      comentario: comentario?.trim() || null,
    },
  });
  res.status(201).json({ evidencia, mensaje: 'Evidencia entregada correctamente.' });
});

export default router;
