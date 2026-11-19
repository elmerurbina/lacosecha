/**
 * Cliente de Supabase para el panel administrativo.
 * Usa la clave pública "anon" + la sesión del administrador. Toda autorización real
 * la imponen las políticas RLS (RNF-14/16): ocultar la interfaz no es la protección.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from 'astro:env/client';

export const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const sb: SupabaseClient = configured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'lc-admin-auth' },
    })
  : (null as unknown as SupabaseClient);

/** Traduce errores técnicos a mensajes comprensibles sin exponer detalles (RNF-38). */
export function friendlyError(err: unknown): string {
  const e = err as { message?: string; code?: string; status?: number; statusCode?: string };
  const msg = (e?.message ?? '').toLowerCase();
  const code = e?.code ?? '';
  if (msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (msg.includes('email not confirmed')) return 'Debes confirmar tu correo antes de iniciar sesión.';
  if (msg.includes('failed to fetch') || msg.includes('network')) return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
  if (code === '42501' || msg.includes('row-level security') || msg.includes('forbidden') || e?.status === 403)
    return 'No tienes permisos para realizar esta acción.';
  if (code === '23505') return 'Ya existe un registro con ese identificador o nombre.';
  if (code === '23514') return 'Algún dato no cumple las reglas de validación (largo o formato).';
  if (code === '23502') return 'Falta completar un campo obligatorio.';
  if (msg.includes('jwt') || msg.includes('session')) return 'Tu sesión expiró. Inicia sesión de nuevo.';
  if (msg.includes('payload too large') || msg.includes('maximum allowed size')) return 'El archivo supera el tamaño permitido.';
  if (msg.includes('mime') || msg.includes('invalid_mime_type')) return 'Ese tipo de archivo no está permitido.';
  console.error('[admin]', err);
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
