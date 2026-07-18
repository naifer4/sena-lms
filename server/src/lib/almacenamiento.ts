// Almacenamiento de archivos de materiales.
// - En tu computador: se guardan en la carpeta local /uploads (gratis y sin configurar).
// - En internet (despliegue gratis): se guardan en Supabase Storage, porque el
//   servidor gratuito de Render borra sus archivos locales al reiniciarse.
// Se activa Supabase automáticamente si existen las variables de entorno
// SUPABASE_URL y SUPABASE_SERVICE_KEY.
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const CARPETA_UPLOADS = path.join(__dirname, '..', '..', 'uploads');

let supabase: SupabaseClient | null = null;

function clienteSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const clave = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !clave) return null;
  if (!supabase) supabase = createClient(url, clave);
  return supabase;
}

function nombreBucket(): string {
  return process.env.SUPABASE_BUCKET || 'materiales';
}

export interface ArchivoGuardado {
  archivoPath: string; // ruta local o clave en el bucket (se usa para borrar)
  url: string | null; // URL pública (solo cuando se usa Supabase)
}

// Guarda el archivo y devuelve dónde quedó
export async function guardarArchivo(
  nombreArchivo: string,
  contenido: Buffer,
  tipoMime: string,
): Promise<ArchivoGuardado> {
  const cliente = clienteSupabase();

  if (cliente) {
    const { error } = await cliente.storage
      .from(nombreBucket())
      .upload(nombreArchivo, contenido, { contentType: tipoMime, upsert: false });
    if (error) {
      throw new Error(`No se pudo subir el archivo al almacenamiento: ${error.message}`);
    }
    const { data } = cliente.storage.from(nombreBucket()).getPublicUrl(nombreArchivo);
    return { archivoPath: nombreArchivo, url: data.publicUrl };
  }

  // Almacenamiento local (desarrollo)
  if (!fs.existsSync(CARPETA_UPLOADS)) fs.mkdirSync(CARPETA_UPLOADS, { recursive: true });
  fs.writeFileSync(path.join(CARPETA_UPLOADS, nombreArchivo), contenido);
  return { archivoPath: `uploads/${nombreArchivo}`, url: null };
}

// Elimina un archivo guardado previamente (local o en Supabase)
export async function eliminarArchivo(archivoPath: string | null): Promise<void> {
  if (!archivoPath) return;
  const cliente = clienteSupabase();

  if (cliente && !archivoPath.startsWith('uploads/')) {
    await cliente.storage.from(nombreBucket()).remove([archivoPath]);
    return;
  }
  const rutaLocal = path.join(__dirname, '..', '..', archivoPath);
  if (fs.existsSync(rutaLocal)) fs.unlinkSync(rutaLocal);
}
