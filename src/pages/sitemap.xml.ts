import type { APIRoute } from 'astro';
import { nav } from '../data/nav';

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://comunidadlacosecha.com');
  const urls = [...nav.map((n) => n.href), '/privacidad']
    .map((p) => `  <url><loc>${new URL(p, base).href}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`)
    .join('\n');
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
