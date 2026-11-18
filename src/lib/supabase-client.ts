/**
 * Cliente mínimo de Supabase para el navegador (sin dependencias).
 * Solo usa la clave pública "anon"; los permisos reales los imponen las políticas RLS
 * definidas en `supabase/schema.sql` (inserción permitida, lectura denegada).
 * Nunca colocar aquí la service_role key.
 */
const URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

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

/** Registro anónimo de interacciones (RF-35). Falla en silencio. */
export function track(kind: string, detail?: string) {
  if (!isConfigured) return;
  insertRow('interactions', { kind, detail: detail ?? null, path: location.pathname }).catch(() => {});
}
