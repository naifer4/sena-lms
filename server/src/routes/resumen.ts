import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requiereSesion, requiereInstructor } from '../middleware/auth';

const router = Router();
router.use(requiereSesion, requiereInstructor);

// GET /api/resumen — panel de inicio del instructor
router.get('/', async (req, res) => {
  const instructorId = req.usuario!.id;

  const cursos = await prisma.curso.count({ where: { instructorId } });

  // Aprendices distintos matriculados en los cursos del instructor
  const matriculas = await prisma.matricula.findMany({
    where: { curso: { instructorId } },
    select: { aprendizId: true },
  });
  const aprendices = new Set(matriculas.map((m) => m.aprendizId)).size;

  const entregasPendientes = await prisma.evidencia.count({
    where: {
      estado: 'pendiente',
      actividad: { competencia: { curso: { instructorId } } },
    },
  });

  res.json({ resumen: { cursos, aprendices, entregasPendientes } });
});

export default router;
