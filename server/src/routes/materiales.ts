import { Router } from 'express';
import path from 'path';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { requiereSesion, requiereInstructor } from '../middleware/auth';
import { esErrorAcceso, esUrlValida } from '../lib/validaciones';
import { guardarArchivo, eliminarArchivo } from '../lib/almacenamiento';

const router = Router();
router.use(requiereSesion);

// Extensiones permitidas para los materiales del instructor
const EXTENSIONES_PERMITIDAS = [
  '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.pdf',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.zip',
];

// El archivo llega a memoria y luego se guarda en disco local o en Supabase Storage
const subida = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB máximo
  fileFilter: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (EXTENSIONES_PERMITIDAS.includes(extension)) return cb(null, true);
    cb(new Error(`Tipo de archivo no permitido (${extension}). Usa: ${EXTENSIONES_PERMITIDAS.join(', ')}`));
  },
});

// Genera un nombre de archivo único y seguro conservando la extensión
function nombreUnico(nombreOriginal: string): string {
  const extension = path.extname(nombreOriginal).toLowerCase();
  const base = path
    .basename(nombreOriginal, extension)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  return `${Date.now()}-${base}${extension}`;
}

// Comprueba que la sección pertenezca a un curso del instructor y no sea la de evidencias
async function seccionDelInstructor(seccionId: number, instructorId: number) {
  const seccion = await prisma.seccion.findUnique({
    where: { id: seccionId },
    include: { competencia: { include: { curso: true } } },
  });
  if (!seccion) return { error: 'La sección no existe.', codigo: 404 as const };
  if (seccion.competencia.curso.instructorId !== instructorId) {
    return { error: 'No puedes gestionar cursos de otro instructor.', codigo: 403 as const };
  }
  if (seccion.tipo === 'evidencias') {
    return {
      error: 'En la sección de evidencias no se suben materiales: allí los aprendices registran sus URLs.',
      codigo: 400 as const,
    };
  }
  return { seccion };
}

// POST /api/secciones/:id/materiales — subir archivo o registrar enlace (secciones 1-5)
router.post('/:id/materiales', requiereInstructor, (req, res) => {
  subida.single('archivo')(req, res, async (err: unknown) => {
    if (err) {
      const mensaje = err instanceof Error ? err.message : 'Error al subir el archivo.';
      return res.status(400).json({ error: mensaje });
    }
    try {
      const id = Number(req.params.id);
      const check = await seccionDelInstructor(id, req.usuario!.id);
      if (esErrorAcceso(check)) {
        return res.status(check.codigo).json({ error: check.error });
      }

      const { titulo, url } = req.body ?? {};
      if (!titulo?.trim()) {
        return res.status(400).json({ error: 'El título del material es obligatorio.' });
      }

      // Caso 1: material tipo archivo
      if (req.file) {
        const guardado = await guardarArchivo(
          nombreUnico(req.file.originalname),
          req.file.buffer,
          req.file.mimetype,
        );
        const material = await prisma.material.create({
          data: {
            seccionId: id,
            titulo: titulo.trim(),
            tipo: 'archivo',
            archivoPath: guardado.archivoPath,
            url: guardado.url,
          },
        });
        return res.status(201).json({ material });
      }

      // Caso 2: material tipo enlace
      if (!url?.trim() || !esUrlValida(url.trim())) {
        return res.status(400).json({ error: 'Debes adjuntar un archivo o indicar una URL válida (http/https).' });
      }
      const material = await prisma.material.create({
        data: { seccionId: id, titulo: titulo.trim(), tipo: 'enlace', url: url.trim() },
      });
      res.status(201).json({ material });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Error interno al guardar el material.' });
    }
  });
});

// DELETE /api/secciones/materiales/:id — eliminar material (y su archivo si aplica)
router.delete('/materiales/:id', requiereInstructor, async (req, res) => {
  const id = Number(req.params.id);
  const material = await prisma.material.findUnique({
    where: { id },
    include: { seccion: { include: { competencia: { include: { curso: true } } } } },
  });
  if (!material) return res.status(404).json({ error: 'El material no existe.' });
  if (material.seccion.competencia.curso.instructorId !== req.usuario!.id) {
    return res.status(403).json({ error: 'No puedes gestionar cursos de otro instructor.' });
  }
  if (material.tipo === 'archivo') {
    await eliminarArchivo(material.archivoPath);
  }
  await prisma.material.delete({ where: { id } });
  res.json({ mensaje: 'Material eliminado correctamente.' });
});

export default router;
