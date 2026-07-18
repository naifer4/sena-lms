import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { requiereSesion, requiereInstructor } from '../middleware/auth';
import { eliminarArchivo } from '../lib/almacenamiento';
import { esErrorAcceso } from '../lib/validaciones';

const router = Router();
router.use(requiereSesion);

// Comprueba acceso a la competencia: instructor dueño del curso o aprendiz matriculado
async function competenciaConAcceso(competenciaId: number, usuario: { id: number; rol: string }) {
  const competencia = await prisma.competencia.findUnique({
    where: { id: competenciaId },
    include: { curso: true },
  });
  if (!competencia) return { error: 'La competencia no existe.', codigo: 404 as const };

  if (usuario.rol === 'instructor') {
    if (competencia.curso.instructorId !== usuario.id) {
      return { error: 'No puedes gestionar cursos de otro instructor.', codigo: 403 as const };
    }
  } else {
    const matricula = await prisma.matricula.findUnique({
      where: { cursoId_aprendizId: { cursoId: competencia.cursoId, aprendizId: usuario.id } },
    });
    if (!matricula) return { error: 'No estás matriculado en este curso.', codigo: 403 as const };
  }
  return { competencia };
}

// GET /api/competencias/:id — detalle: secciones con materiales y actividades
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const check = await competenciaConAcceso(id, req.usuario!);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const esAprendiz = req.usuario!.rol === 'aprendiz';
  const competencia = await prisma.competencia.findUnique({
    where: { id },
    include: {
      curso: { select: { id: true, nombre: true } },
      secciones: { include: { materiales: { orderBy: { creadoEn: 'desc' } } } },
      actividades: {
        orderBy: { codigo: 'asc' },
        include: {
          evidencias: {
            // El aprendiz solo ve sus propias evidencias
            where: esAprendiz ? { aprendizId: req.usuario!.id } : undefined,
            include: { aprendiz: { select: { id: true, nombre: true } } },
            orderBy: { creadoEn: 'desc' },
          },
        },
      },
    },
  });
  res.json({ competencia });
});

// PUT /api/competencias/:id — editar código y nombre
router.put('/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await competenciaConAcceso(id, req.usuario!);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { codigo, nombre } = req.body ?? {};
  if (!codigo?.trim() || !nombre?.trim()) {
    return res.status(400).json({ error: 'El código y el nombre son obligatorios.' });
  }
  const competencia = await prisma.competencia.update({
    where: { id },
    data: { codigo: codigo.trim(), nombre: nombre.trim() },
  });
  res.json({ competencia });
});

// DELETE /api/competencias/:id — eliminar competencia (y sus archivos subidos)
router.delete('/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await competenciaConAcceso(id, req.usuario!);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  // Borra los archivos guardados de las secciones de esta competencia
  const materiales = await prisma.material.findMany({
    where: { seccion: { competenciaId: id }, tipo: 'archivo' },
  });
  for (const m of materiales) {
    await eliminarArchivo(m.archivoPath);
  }
  await prisma.competencia.delete({ where: { id } });
  res.json({ mensaje: 'Competencia eliminada correctamente.' });
});

// POST /api/competencias/:id/actividades — crear actividad (AA_01...AA_05)
router.post('/:id/actividades', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await competenciaConAcceso(id, req.usuario!);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { codigo, titulo, descripcion } = req.body ?? {};
  if (!codigo?.trim() || !titulo?.trim()) {
    return res.status(400).json({ error: 'El código (ej. AA_01) y el título son obligatorios.' });
  }
  const actividad = await prisma.actividad.create({
    data: {
      competenciaId: id,
      codigo: codigo.trim(),
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
    },
  });
  res.status(201).json({ actividad });
});

export default router;
