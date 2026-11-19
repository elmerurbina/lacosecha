/**
 * Enlaces de Facebook → reproductor embebido.
 *
 * El reproductor de Facebook (plugins/video.php) solo acepta enlaces directos a un video.
 * Los enlaces "Compartir" (facebook.com/share/v/…, fb.watch/…) y los de publicaciones
 * hacen que muestre «Este video no está disponible». Aquí se clasifican y se convierten.
 */
export type FacebookKind = 'video' | 'post' | 'share' | 'unknown';

export interface FacebookLink {
  kind: FacebookKind;
  /** Enlace que se pasa al reproductor (o el original si no se pudo convertir). */
  href: string;
  videoId?: string;
}

const FB_HOSTS = /^(?:www\.|m\.|web\.|mbasic\.)?facebook\.com$|^fb\.watch$/i;

export function isFacebookHost(host: string): boolean {
  return FB_HOSTS.test(host);
}

export function parseFacebookUrl(raw: string): FacebookLink | null {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:' || !isFacebookHost(u.hostname)) return null;
  const path = u.pathname;

  if (/^fb\.watch$/i.test(u.hostname) || /^\/share\//.test(path)) return { kind: 'share', href: u.href };

  const id =
    path.match(/\/videos\/(?:[^/]+\/)?(\d{6,})/)?.[1] ??
    path.match(/^\/reel\/(\d{6,})/)?.[1] ??
    (/^\/(?:watch|video\.php|watch\/live)\/?$/.test(path) ? u.searchParams.get('v') ?? undefined : undefined);
  if (id && /^\d{6,}$/.test(id)) {
    // Formato oficial del reproductor: /{página}/videos/{id}/. Para reels y watch se usa watch/?v={id}.
    const official = path.match(/^\/[^/]+\/videos\/(?:[^/]+\/)?\d{6,}/)?.[0];
    return { kind: 'video', videoId: id, href: official ? `https://www.facebook.com${official}/` : `https://www.facebook.com/watch/?v=${id}` };
  }

  if (/\/posts\/|^\/permalink\.php|^\/story\.php|^\/groups\/[^/]+\/permalink\//.test(path))
    return { kind: 'post', href: `https://www.facebook.com${path}${u.search}` };

  return { kind: 'unknown', href: u.href };
}

/** URL del iframe del reproductor (video) o de la publicación (post con video). */
export function facebookEmbedSrc(link: FacebookLink): string {
  const href = encodeURIComponent(link.href);
  return link.kind === 'post'
    ? `https://www.facebook.com/plugins/post.php?href=${href}&show_text=false&width=560`
    : `https://www.facebook.com/plugins/video.php?href=${href}&show_text=false&width=560&autoplay=true`;
}

/**
 * Solo en el servidor: resuelve enlaces "Compartir" / fb.watch siguiendo las redirecciones
 * (únicamente dentro de facebook.com) y leyendo og:url de la página final.
 */
export async function resolveFacebookUrl(raw: string): Promise<FacebookLink | null> {
  const first = parseFacebookUrl(raw);
  if (!first || first.kind === 'video' || first.kind === 'post') return first;
  let url = first.href;
  const headers = { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Accept-Language': 'es' };
  try {
    for (let hop = 0; hop < 6; hop++) {
      const res = await fetch(url, { redirect: 'manual', headers, signal: AbortSignal.timeout(6000) });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        const next = new URL(loc, url);
        if (next.protocol !== 'https:' || !isFacebookHost(next.hostname)) break;
        url = next.href;
        const parsed = parseFacebookUrl(url);
        if (parsed && (parsed.kind === 'video' || parsed.kind === 'post')) return parsed;
        continue;
      }
      if (!res.ok) break;
      const html = (await res.text()).slice(0, 400_000);
      const og = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&');
      const parsed = og ? parseFacebookUrl(og) : null;
      if (parsed && (parsed.kind === 'video' || parsed.kind === 'post')) return parsed;
      break;
    }
  } catch { /* sin red o Facebook no respondió: se usa el enlace tal cual */ }
  const last = parseFacebookUrl(url);
  return last && last.kind !== 'share' ? last : first;
}
