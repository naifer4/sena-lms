import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import authRouter from './routes/auth';
import cursosRouter from './routes/cursos';
import competenciasRouter from './routes/competencias';
import materialesRouter from './routes/materiales';
import actividadesRouter from './routes/actividades';
import evidenciasRouter from './routes/evidencias';
import resumenRouter from './routes/resumen';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

// Archivos subidos por el instructor (materiales)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Rutas de la API
app.use('/api/auth', authRouter);
app.use('/api/cursos', cursosRouter);
app.use('/api/competencias', competenciasRouter);
app.use('/api/secciones', materialesRouter); // POST /api/secciones/:id/materiales y DELETE /api/secciones/materiales/:id
app.use('/api/actividades', actividadesRouter);
app.use('/api/evidencias', evidenciasRouter);
app.use('/api/resumen', resumenRouter);

// Comprobación de estado
app.get('/api/salud', (_req, res) => res.json({ ok: true }));

// En producción (despliegue), el servidor también sirve la app web compilada
const carpetaCliente = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(carpetaCliente)) {
  app.use(express.static(carpetaCliente));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(carpetaCliente, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Servidor SENA LMS escuchando en http://localhost:${PORT}`);
});
