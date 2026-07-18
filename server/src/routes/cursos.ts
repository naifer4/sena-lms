import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { requiereSesion, requiereInstructor } from '../middleware/auth';
import {
  MAX_CURSOS,
  MAX_APRENDICES_POR_CURSO,
  TIPOS_SECCION,
  esCorreoValido,
  esErrorAcceso,
} from '../lib/validaciones';

const router = Router();
router.use(requiereSesion);

// Comprueba que el curso exista y pertenezca al instructor autenticado
async function cursoDelInstructor(cursoId: number, instructorId: number) {
  const curso = await prisma.curso.findUnique({ where: { id: cursoId } });
  if (!curso) return { error: 'El curso no existe.', codigo: 404 as const };
  if (curso.instructorId !== instructorId) {
    return { error: 'No puedes gestionar cursos de otro instructor.', codigo: 403 as const };
  }
  return { curso };
}

// GET /api/cursos — instructor: sus cursos; aprendiz: cursos donde está matriculado
router.get('/', async (req, res) => {
  if (req.usuario!.rol === 'instructor') {
    const cursos = await prisma.curso.findMany({
      where: { instructorId: req.usuario!.id },
      include: { _count: { select: { competencias: true, matriculas: true } } },
      orderBy: { id: 'asc' },
    });
    return res.json({ cursos });
  }
  const matriculas = await prisma.matricula.findMany({
    where: { aprendizId: req.usuario!.id },
    include: {
      curso: {
        include: {
          instructor: { select: { nombre: true } },
          _count: { select: { competencias: true } },
        },
      },
    },
  });
  res.json({ cursos: matriculas.map((m) => m.curso) });
});

// POST /api/cursos — crear curso (máximo 10 en total)
router.post('/', requiereInstructor, async (req, res) => {
  const { nombre, descripcion, ficha } = req.body ?? {};
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del curso es obligatorio.' });
  }
  const total = await prisma.curso.count();
  if (total >= MAX_CURSOS) {
    return res.status(409).json({
      error: `No se puede crear el curso: ya se alcanzó el máximo de ${MAX_CURSOS} cursos permitidos.`,
    });
  }
  const curso = await prisma.curso.create({
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      ficha: ficha?.trim() || null,
      instructorId: req.usuario!.id,
    },
  });
  res.status(201).json({ curso });
});

// GET /api/cursos/:id — detalle del curso (instructor dueño o aprendiz matriculado)
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const curso = await prisma.curso.findUnique({
    where: { id },
    include: {
      instructor: { select: { id: true, nombre: true, correo: true } },
      competencias: { orderBy: { orden: 'asc' }, include: { _count: { select: { actividades: true } } } },
      _count: { select: { matriculas: true } },
    },
  });
  if (!curso) return res.status(404).json({ error: 'El curso no existe.' });

  if (req.usuario!.rol === 'instructor') {
    if (curso.instructorId !== req.usuario!.id) {
      return res.status(403).json({ error: 'No puedes ver cursos de otro instructor.' });
    }
  } else {
    const matricula = await prisma.matricula.findUnique({
      where: { cursoId_aprendizId: { cursoId: id, aprendizId: req.usuario!.id } },
    });
    if (!matricula) {
      return res.status(403).json({ error: 'No estás matriculado en este curso.' });
    }
  }
  res.json({ curso });
});

// PUT /api/cursos/:id — editar curso
router.put('/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { nombre, descripcion, ficha } = req.body ?? {};
  if (!nombre?.trim()) {
    return res.status(400).json({ error: 'El nombre del curso es obligatorio.' });
  }
  const curso = await prisma.curso.update({
    where: { id },
    data: {
      nombre: nombre.trim(),
      descripcion: descripcion?.trim() || null,
      ficha: ficha?.trim() || null,
    },
  });
  res.json({ curso });
});

// DELETE /api/cursos/:id — eliminar curso (borra en cascada su contenido)
router.delete('/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  await prisma.curso.delete({ where: { id } });
  res.json({ mensaje: 'Curso eliminado correctamente.' });
});

// POST /api/cursos/:id/competencias — crear competencia con sus 6 secciones
router.post('/:id/competencias', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { codigo, nombre } = req.body ?? {};
  if (!codigo?.trim() || !nombre?.trim()) {
    return res.status(400).json({ error: 'El código y el nombre de la competencia son obligatorios.' });
  }
  const ultima = await prisma.competencia.findFirst({
    where: { cursoId: id },
    orderBy: { orden: 'desc' },
  });
  const competencia = await prisma.competencia.create({
    data: {
      cursoId: id,
      codigo: codigo.trim(),
      nombre: nombre.trim(),
      orden: (ultima?.orden ?? 0) + 1,
      secciones: { create: TIPOS_SECCION.map((tipo) => ({ tipo })) },
    },
    include: { secciones: true },
  });
  res.status(201).json({ competencia });
});

// GET /api/cursos/:id/aprendices — lista de aprendices matriculados
router.get('/:id/aprendices', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const matriculas = await prisma.matricula.findMany({
    where: { cursoId: id },
    include: { aprendiz: { select: { id: true, nombre: true, correo: true } } },
    orderBy: { creadoEn: 'asc' },
  });
  res.json({ aprendices: matriculas.map((m) => m.aprendiz) });
});

// POST /api/cursos/:id/aprendices — matricular aprendiz (crea la cuenta si no existe)
router.post('/:id/aprendices', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { nombre, correo, password } = req.body ?? {};
  if (!correo?.trim() || !esCorreoValido(correo)) {
    return res.status(400).json({ error: 'Debes indicar un correo válido.' });
  }

  const totalMatriculados = await prisma.matricula.count({ where: { cursoId: id } });
  if (totalMatriculados >= MAX_APRENDICES_POR_CURSO) {
    return res.status(409).json({
      error: `No se puede matricular: el curso ya tiene el máximo de ${MAX_APRENDICES_POR_CURSO} aprendices.`,
    });
  }

  const correoNormalizado = String(correo).toLowerCase();
  let aprendiz = await prisma.usuario.findUnique({ where: { correo: correoNormalizado } });
  let cuentaCreada = false;

  if (aprendiz && aprendiz.rol !== 'aprendiz') {
    return res.status(409).json({ error: 'Ese correo pertenece a un instructor, no se puede matricular.' });
  }

  if (!aprendiz) {
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'Para crear la cuenta del aprendiz debes indicar su nombre.' });
    }
    const passwordInicial = password?.trim() || 'Sena2026*';
    aprendiz = await prisma.usuario.create({
      data: {
        nombre: nombre.trim(),
        correo: correoNormalizado,
        passwordHash: await bcrypt.hash(passwordInicial, 10),
        rol: 'aprendiz',
      },
    });
    cuentaCreada = true;
  }

  const yaMatriculado = await prisma.matricula.findUnique({
    where: { cursoId_aprendizId: { cursoId: id, aprendizId: aprendiz.id } },
  });
  if (yaMatriculado) {
    return res.status(409).json({ error: 'Ese aprendiz ya está matriculado en este curso.' });
  }

  await prisma.matricula.create({ data: { cursoId: id, aprendizId: aprendiz.id } });
  res.status(201).json({
    aprendiz: { id: aprendiz.id, nombre: aprendiz.nombre, correo: aprendiz.correo },
    mensaje: cuentaCreada
      ? `Cuenta creada y aprendiz matriculado. Contraseña inicial: ${password?.trim() || 'Sena2026*'}`
      : 'Aprendiz matriculado correctamente.',
  });
});

// DELETE /api/cursos/:id/aprendices/:aprendizId — retirar aprendiz del curso
router.delete('/:id/aprendices/:aprendizId', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const aprendizId = Number(req.params.aprendizId);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const matricula = await prisma.matricula.findUnique({
    where: { cursoId_aprendizId: { cursoId: id, aprendizId } },
  });
  if (!matricula) return res.status(404).json({ error: 'Ese aprendiz no está matriculado en este curso.' });

  await prisma.matricula.delete({
    where: { cursoId_aprendizId: { cursoId: id, aprendizId } },
  });
  res.json({ mensaje: 'Aprendiz retirado del curso.' });
});

// GET /api/cursos/:id/evidencias — todas las evidencias del curso (con filtros)
router.get('/:id/evidencias', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const check = await cursoDelInstructor(id, req.usuario!.id);
  if (esErrorAcceso(check)) return res.status(check.codigo).json({ error: check.error });

  const { estado, competenciaId, aprendizId } = req.query;
  const evidencias = await prisma.evidencia.findMany({
    where: {
      actividad: {
        competencia: {
          cursoId: id,
          ...(competenciaId ? { id: Number(competenciaId) } : {}),
        },
      },
      ...(estado ? { estado: String(estado) } : {}),
      ...(aprendizId ? { aprendizId: Number(aprendizId) } : {}),
    },
    include: {
      aprendiz: { select: { id: true, nombre: true, correo: true } },
      actividad: { include: { competencia: { select: { id: true, codigo: true, nombre: true } } } },
    },
    orderBy: { creadoEn: 'desc' },
  });
  res.json({ evidencias });
});

export default router;
