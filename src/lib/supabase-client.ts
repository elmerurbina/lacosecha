/**
 * Cliente mínimo de Supabase para el navegador (sin dependencias).
 * Solo usa la clave pública "anon"; los permisos reales los imponen las políticas RLS
 * definidas en `supabase/schema.sql` (inserción permitida, lectura denegada).
 * Nunca colocar aquí la service_role key.
 */
import { SUPABASE_URL as URL, SUPABASE_ANON_KEY as KEY } from 'astro:env/client';

export const isConfigured = Boolean(URL && KEY);

export async function insertRow(table: string, row: Record<string, unknown>): Promise<void> {
  if (!isConfigured) throw new Error('not-configured');
  const res = await fetch(`${URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
    keepalive: true,
  });
  if (!res.ok) throw new Error(res.status === 429 ? 'rate-limited' : `http-${res.status}`);
}

/**
 * Identificadores anónimos aleatorios (no contienen datos personales):
 * - visitante: persiste en este navegador (localStorage)
 * - sesión: dura mientras la pestaña esté abierta (sessionStorage)
 */
function anonId(store: 'localStorage' | 'sessionStorage', key: string): string | null {
  try {
    const s = window[store];
    let id = s.getItem(key);
    if (!id) { id = crypto.randomUUID(); s.setItem(key, id); }
    return id;
  } catch {
    return null;
  }
}

/** Registro anónimo de interacciones (RF-35). Falla en silencio. */
export function track(kind: 'page_view' | 'click', detail?: string) {
  if (!isConfigured || location.hostname === 'localhost' || navigator.webdriver) return;
  insertRow('interactions', {
    kind,
    detail: detail ? detail.slice(0, 300) : null,
    path: location.pathname.slice(0, 200),
    visitor_id: anonId('localStorage', 'lc-vid'),
    session_id: anonId('sessionStorage', 'lc-sid'),
  }).catch(() => {});
}
