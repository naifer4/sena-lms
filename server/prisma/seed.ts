// Seed de datos de demostración del LMS SENA
// Crea: instructor, 1 curso con 14 competencias (6 secciones cada una),
// 3 aprendices matriculados, actividades de ejemplo y 1 evidencia de muestra.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const TIPOS_SECCION = [
  'guias',
  'presentaciones',
  'material_apoyo',
  'instrumentos',
  'planes_sesion',
  'evidencias',
];

// Las 14 competencias del programa 233104 - Técnico en Programación de Software
const COMPETENCIAS = [
  ['220501092', 'Establecimiento de requisitos de la solución de software'],
  ['220501096', 'Desarrollo de la solución de software'],
  ['220501113', 'Administración de base de datos'],
  ['220501046', 'Utilizar herramientas informáticas y TIC'],
  ['220601501', 'Aplicar prácticas de protección ambiental y SST'],
  ['240201524', 'Procesos de comunicación'],
  ['210201501', 'Derechos fundamentales del trabajo'],
  ['240201526', 'Cultura de paz y ética'],
  ['240201533', 'Fomentar la cultura emprendedora'],
  ['240202501', 'Inglés'],
  ['240201528', 'Razonamiento cuantitativo (matemáticas)'],
  ['230101507', 'Actividad física y hábitos saludables'],
  ['240201530', 'Inducción a la formación'],
  ['999999999', 'Etapa práctica / productiva'],
];

async function main() {
  console.log('Sembrando datos de demostración...');

  // --- Instructor ---
  const instructor = await prisma.usuario.upsert({
    where: { correo: 'naiferdev@gmail.com' },
    update: {},
    create: {
      nombre: 'Naifer David Blanco Vacca',
      correo: 'naiferdev@gmail.com',
      passwordHash: await bcrypt.hash('Sena2026*', 10),
      rol: 'instructor',
    },
  });

  // --- Curso demo ---
  let curso = await prisma.curso.findFirst({ where: { instructorId: instructor.id } });
  if (!curso) {
    curso = await prisma.curso.create({
      data: {
        nombre: 'Técnico en Programación de Software',
        descripcion:
          'Programa 233104 del SENA en articulación con la media técnica. Forma aprendices en análisis, diseño, desarrollo y mantenimiento de soluciones de software.',
        ficha: '233104',
        instructorId: instructor.id,
      },
    });
  }

  // --- 14 competencias con sus 6 secciones ---
  for (let i = 0; i < COMPETENCIAS.length; i++) {
    const [codigo, nombre] = COMPETENCIAS[i];
    const existente = await prisma.competencia.findFirst({
      where: { cursoId: curso.id, codigo },
    });
    if (!existente) {
      await prisma.competencia.create({
        data: {
          cursoId: curso.id,
          codigo,
          nombre,
          orden: i + 1,
          secciones: { create: TIPOS_SECCION.map((tipo) => ({ tipo })) },
        },
      });
    }
  }

  // --- 3 aprendices de prueba matriculados ---
  const aprendicesDemo = [
    { nombre: 'Ana María Pérez', correo: 'ana.perez@demo.sena.co' },
    { nombre: 'Carlos Andrés Gómez', correo: 'carlos.gomez@demo.sena.co' },
    { nombre: 'Luisa Fernanda Ríos', correo: 'luisa.rios@demo.sena.co' },
  ];
  const aprendices = [];
  for (const a of aprendicesDemo) {
    const aprendiz = await prisma.usuario.upsert({
      where: { correo: a.correo },
      update: {},
      create: {
        nombre: a.nombre,
        correo: a.correo,
        passwordHash: await bcrypt.hash('Aprendiz2026*', 10),
        rol: 'aprendiz',
      },
    });
    aprendices.push(aprendiz);
    await prisma.matricula.upsert({
      where: { cursoId_aprendizId: { cursoId: curso.id, aprendizId: aprendiz.id } },
      update: {},
      create: { cursoId: curso.id, aprendizId: aprendiz.id },
    });
  }

  // --- Actividades de ejemplo en la primera competencia ---
  const primera = await prisma.competencia.findFirst({
    where: { cursoId: curso.id, codigo: '220501092' },
  });
  if (primera) {
    const actividadesDemo = [
      {
        codigo: 'AA_01',
        titulo: 'Documento de requisitos del proyecto formativo',
        descripcion:
          'Elabora el documento de especificación de requisitos (funcionales y no funcionales) y publícalo en tu repositorio o en Drive. Entrega la URL.',
      },
      {
        codigo: 'AA_02',
        titulo: 'Historias de usuario y mockups',
        descripcion:
          'Redacta las historias de usuario del proyecto y diseña los mockups de las pantallas. Entrega la URL donde estén publicados.',
      },
    ];
    for (const act of actividadesDemo) {
      const existe = await prisma.actividad.findFirst({
        where: { competenciaId: primera.id, codigo: act.codigo },
      });
      if (!existe) {
        await prisma.actividad.create({ data: { competenciaId: primera.id, ...act } });
      }
    }

    // --- Evidencia de muestra (pendiente de revisar) ---
    const actividad1 = await prisma.actividad.findFirst({
      where: { competenciaId: primera.id, codigo: 'AA_01' },
    });
    if (actividad1 && aprendices[0]) {
      await prisma.evidencia.upsert({
        where: {
          actividadId_aprendizId: {
            actividadId: actividad1.id,
            aprendizId: aprendices[0].id,
          },
        },
        update: {},
        create: {
          actividadId: actividad1.id,
          aprendizId: aprendices[0].id,
          titulo: 'Requisitos - Sistema de inventario',
          url: 'https://github.com/anaperez-demo/requisitos-inventario',
          comentario: 'Profe, este es el enlace a mi repositorio con el documento de requisitos.',
        },
      });
    }
  }

  console.log('Datos de demostración creados correctamente:');
  console.log('  Instructor: naiferdev@gmail.com / Sena2026*');
  console.log('  Aprendices: ana.perez@demo.sena.co, carlos.gomez@demo.sena.co, luisa.rios@demo.sena.co / Aprendiz2026*');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
