import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'clave-desarrollo-sena-lms';

export interface UsuarioToken {
  id: number;
  nombre: string;
  correo: string;
  rol: 'instructor' | 'aprendiz';
}

// Extendemos Request para incluir el usuario autenticado
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioToken;
    }
  }
}

export function generarToken(usuario: UsuarioToken): string {
  return jwt.sign(usuario, JWT_SECRET, { expiresIn: '8h' });
}

// Middleware: exige un token JWT válido
export function requiereSesion(req: Request, res: Response, next: NextFunction) {
  const cabecera = req.headers.authorization;
  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Debes iniciar sesión.' });
  }
  try {
    const token = cabecera.slice(7);
    req.usuario = jwt.verify(token, JWT_SECRET) as UsuarioToken;
    next();
  } catch {
    return res.status(401).json({ error: 'Tu sesión expiró. Inicia sesión de nuevo.' });
  }
}

// Middleware: exige rol instructor
export function requiereInstructor(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.rol !== 'instructor') {
    return res.status(403).json({ error: 'Esta acción solo está permitida para el instructor.' });
  }
  next();
}

// Middleware: exige rol aprendiz
export function requiereAprendiz(req: Request, res: Response, next: NextFunction) {
  if (req.usuario?.rol !== 'aprendiz') {
    return res.status(403).json({ error: 'Esta acción solo está permitida para aprendices.' });
  }
  next();
}
