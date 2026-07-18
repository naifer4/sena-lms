import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requiereSesion, requiereInstructor, requiereAprendiz } from '../middleware/auth';

const router = Router();
router.use(requiereSesion);

// GET /api/evidencias/mias — todas las entregas del aprendiz autenticado
router.get('/mias', requiereAprendiz, async (req, res) => {
  const evidencias = await prisma.evidencia.findMany({
    where: { aprendizId: req.usuario!.id },
    include: {
      actividad: {
        include: {
          competencia: {
            select: { id: true, codigo: true, nombre: true, curso: { select: { id: true, nombre: true } } },
          },
        },
      },
    },
    orderBy: { creadoEn: 'desc' },
  });
  res.json({ evidencias });
});

// PUT /api/evidencias/:id/calificar — el instructor califica y deja retroalimentación
router.put('/:id/calificar', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const evidencia = await prisma.evidencia.findUnique({
    where: { id },
    include: { actividad: { include: { competencia: { include: { curso: true } } } } },
  });
  if (!evidencia) return res.status(404).json({ error: 'La evidencia no existe.' });
  if (evidencia.actividad.competencia.curso.instructorId !== req.usuario!.id) {
    return res.status(403).json({ error: 'No puedes calificar evidencias de cursos de otro instructor.' });
  }

  const { estado, nota, retroalimentacion } = req.body ?? {};
  if (estado && !['pendiente', 'revisado'].includes(estado)) {
    return res.status(400).json({ error: 'El estado debe ser "pendiente" o "revisado".' });
  }
  let notaNumerica: number | null = null;
  if (nota !== undefined && nota !== null && nota !== '') {
    notaNumerica = Number(nota);
    if (Number.isNaN(notaNumerica) || notaNumerica < 0 || notaNumerica > 5) {
      return res.status(400).json({ error: 'La nota debe ser un número entre 0.0 y 5.0.' });
    }
  }

  const actualizada = await prisma.evidencia.update({
    where: { id },
    data: {
      estado: estado ?? 'revisado',
      nota: notaNumerica,
      retroalimentacion: retroalimentacion?.trim() || null,
    },
    include: { aprendiz: { select: { id: true, nombre: true } } },
  });
  res.json({ evidencia: actualizada, mensaje: 'Evidencia calificada correctamente.' });
});

// DELETE /api/evidencias/:id — el aprendiz puede eliminar su propia entrega
router.delete('/:id', requiereAprendiz, async (req, res) => {
  const id = Number(req.params.id);
  const evidencia = await prisma.evidencia.findUnique({ where: { id } });
  if (!evidencia) return res.status(404).json({ error: 'La evidencia no existe.' });
  if (evidencia.aprendizId !== req.usuario!.id) {
    return res.status(403).json({ error: 'Solo puedes eliminar tus propias evidencias.' });
  }
  await prisma.evidencia.delete({ where: { id } });
  res.json({ mensaje: 'Evidencia eliminada.' });
});

export default router;
