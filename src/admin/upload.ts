/**
 * Subida de archivos a Supabase Storage (RF-26, RNF-05, RNF-20, RNF-23).
 * - Valida tipo MIME, extensión y tamaño antes de subir (el bucket vuelve a validarlo).
 * - Las imágenes se redimensionan (máx. 2000 px) y se convierten a WebP en el navegador.
 * - Los nombres de archivo se generan (UUID); nunca se usa el nombre original.
 */
import { sb } from './sb';

export const BUCKET = 'media';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const VIDEO_TYPES = ['video/mp4'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // antes de comprimir
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_DIMENSION = 2000;

export type MediaKind = 'image' | 'video';

export function validateFile(file: File, kind: MediaKind): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (kind === 'image') {
    if (!IMAGE_TYPES.includes(file.type) || !['jpg', 'jpeg', 'png', 'webp', 'avif'].includes(ext))
      return 'Formato no permitido. Usa JPG, PNG, WebP o AVIF.';
    if (file.size > MAX_IMAGE_BYTES) return 'La imagen supera 10 MB.';
  } else {
    if (!VIDEO_TYPES.includes(file.type) || ext !== 'mp4') return 'Solo se permiten videos MP4.';
    if (file.size > MAX_VIDEO_BYTES) return 'El video supera 50 MB. Para prédicas largas usa el enlace de Facebook.';
  }
  return null;
}

async function toWebp(file: File): Promise<Blob> {
  if (file.type === 'image/avif') return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const hgt = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = hgt;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, hgt);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.85));
  if (!blob) throw new Error('No se pudo procesar la imagen.');
  return blob;
}

/** Sube el archivo y devuelve su URL pública. */
export async function uploadMedia(file: File, kind: MediaKind, folder: string): Promise<string> {
  const problem = validateFile(file, kind);
  if (problem) throw new Error(problem);
  let body: Blob = file;
  let ext = kind === 'video' ? 'mp4' : 'webp';
  let contentType = kind === 'video' ? 'video/mp4' : 'image/webp';
  if (kind === 'image') {
    body = await toWebp(file);
    if (file.type === 'image/avif') { ext = 'avif'; contentType = 'image/avif'; }
  }
  const path = `${folder}/${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, body, { contentType, cacheControl: '31536000', upsert: false });
  if (error) throw error;
  return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Genera una portada (WebP) a partir de un fotograma del video, en el navegador.
 * Se usa el archivo local (no la URL) para que el lienzo no quede bloqueado por CORS.
 */
export async function frameFromVideo(file: File, at = 3): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    await new Promise<void>((ok, fail) => { v.onloadeddata = () => ok(); v.onerror = () => fail(new Error('No se pudo leer el video.')); });
    const t = Math.min(at, Math.max(0, (v.duration || 0) / 3));
    if (t > 0) await new Promise<void>((ok) => { v.onseeked = () => ok(); v.currentTime = t; });
    const scale = Math.min(1, 1280 / (v.videoWidth || 1280));
    const c = document.createElement('canvas');
    c.width = Math.round((v.videoWidth || 1280) * scale);
    c.height = Math.round((v.videoHeight || 720) * scale);
    c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/webp', 0.85));
    if (!blob) throw new Error('No se pudo generar la portada.');
    return new File([blob], 'portada.webp', { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Elimina un archivo del bucket si la URL pertenece a él (ignora URLs externas). */
export async function removeMedia(url?: string | null): Promise<void> {
  if (!url) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i === -1) return;
  const path = decodeURIComponent(url.slice(i + marker.length).split('?')[0]);
  await sb.storage.from(BUCKET).remove([path]).catch(() => {});
}
