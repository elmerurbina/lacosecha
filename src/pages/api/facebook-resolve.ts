/**
 * POST /api/facebook-resolve  { url }  →  { kind, href, videoId? }
 * Convierte enlaces de Facebook (incluidos "Compartir" y fb.watch) al formato que acepta el reproductor.
 * Solo para administradores: se verifica el token de Supabase contra la tabla `admins` (RLS).
 * Solo se hacen peticiones a facebook.com / fb.watch (ver resolveFacebookUrl).
 */
import type { APIRoute } from 'astro';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from 'astro:env/client';
import { parseFacebookUrl, resolveFacebookUrl } from '../../lib/facebook';

export const prerender = false;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function isAdmin(token: string | null): Promise<boolean> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return import.meta.env.DEV; // sin Supabase: solo en desarrollo
  if (!token) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/admins?select=user_id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
  if (!(await isAdmin(token))) return json(401, { error: 'No autorizado.' });

  let url = '';
  try { url = String((await request.json())?.url ?? '').slice(0, 600); } catch { /* cuerpo inválido */ }
  if (!parseFacebookUrl(url)) return json(400, { error: 'El enlace debe ser de facebook.com o fb.watch y comenzar con https://' });

  const link = await resolveFacebookUrl(url);
  return json(200, link);
};
