import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';
import { generarToken, requiereSesion, UsuarioToken } from '../middleware/auth';
import { esCorreoValido } from '../lib/validaciones';

const router = Router();

function usuarioPublico(u: { id: number; nombre: string; correo: string; rol: string }): UsuarioToken {
  return { id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol as UsuarioToken['rol'] };
}

// POST /api/auth/registro — registro de un instructor
// Si la variable de entorno CODIGO_REGISTRO está definida, se exige ese código
// (útil cuando la app está publicada en internet, para que extraños no creen cuentas).
router.post('/registro', async (req, res) => {
  const { nombre, correo, password, codigo } = req.body ?? {};
  const codigoRequerido = process.env.CODIGO_REGISTRO;
  if (codigoRequerido && codigo?.trim() !== codigoRequerido) {
    return res.status(403).json({
      error: 'El código de registro no es válido. Pídeselo al administrador de la plataforma.',
    });
  }
  if (!nombre?.trim() || !correo?.trim() || !password) {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (!esCorreoValido(correo)) {
    return res.status(400).json({ error: 'El correo no tiene un formato válido.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  const existente = await prisma.usuario.findUnique({ where: { correo: correo.toLowerCase() } });
  if (existente) {
    return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
  }
  const usuario = await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      correo: correo.toLowerCase(),
      passwordHash: await bcrypt.hash(password, 10),
      rol: 'instructor',
    },
  });
  const publico = usuarioPublico(usuario);
  res.status(201).json({ token: generarToken(publico), usuario: publico });
});

// POST /api/auth/login — inicio de sesión (instructor o aprendiz)
router.post('/login', async (req, res) => {
  const { correo, password } = req.body ?? {};
  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son obligatorios.' });
  }
  const usuario = await prisma.usuario.findUnique({ where: { correo: String(correo).toLowerCase() } });
  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
    return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
  }
  const publico = usuarioPublico(usuario);
  res.json({ token: generarToken(publico), usuario: publico });
});

// GET /api/auth/yo — datos del usuario autenticado
router.get('/yo', requiereSesion, async (req, res) => {
  res.json({ usuario: req.usuario });
});

// PUT /api/auth/password — cambiar la propia contraseña
router.put('/password', requiereSesion, async (req, res) => {
  const { actual, nueva } = req.body ?? {};
  if (!actual || !nueva) {
    return res.status(400).json({ error: 'Debes indicar la contraseña actual y la nueva.' });
  }
  if (nueva.length < 6) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }
  const usuario = await prisma.usuario.findUnique({ where: { id: req.usuario!.id } });
  if (!usuario || !(await bcrypt.compare(actual, usuario.passwordHash))) {
    return res.status(401).json({ error: 'La contraseña actual no es correcta.' });
  }
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { passwordHash: await bcrypt.hash(nueva, 10) },
  });
  res.json({ mensaje: 'Contraseña actualizada correctamente.' });
});

export default router;
