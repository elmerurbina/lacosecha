/** Tablero principal (RF-25): resumen de actividad y accesos rápidos. */
import { sb, friendlyError } from '../sb';
import { h, icon, loading, errorState, fmtDate, fmtTime } from '../dom';
import { columnChart, statTile } from '../charts';
import { fetchSeries, toPoints, sum } from '../metrics-data';

async function count(table: string, build?: (q: any) => any): Promise<number> {
  let q = sb.from(table).select('id', { count: 'exact', head: true });
  if (build) q = build(q);
  const { count: c, error } = await q;
  if (error) throw error;
  return c ?? 0;
}

export async function renderDashboard(root: HTMLElement) {
  const body = h('div', null, loading());
  const hour = new Date().getHours();
  root.replaceChildren(
    h('header', { class: 'page-head' }, h('div', null,
      h('h1', null, hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'),
      h('p', { class: 'page-head__desc' }, 'Resumen de la actividad del sitio de la Comunidad Evangélica La Cosecha.'))),
    body,
  );

  const today = new Date().toLocaleDateString('en-CA');
  try {
    const [series, prevSeries, pending, upcoming, sermons, posts, photos, nextEvents] = await Promise.all([
      fetchSeries('month'), fetchSeries('month', 1),
      count('prayer_requests', (q) => q.eq('reviewed', false)),
      count('events', (q) => q.gte('date', today).eq('published', true)),
      count('sermons', (q) => q.eq('published', true)),
      count('announcements', (q) => q.eq('published', true)),
      count('gallery', (q) => q.eq('published', true)),
      sb.from('events').select('id,title,date,time').gte('date', today).eq('published', true).order('date').limit(4),
    ]);
    if (nextEvents.error) throw nextEvents.error;

    const quick = [
      { href: '#/eventos/nuevo', icon: 'calendar', label: 'Nuevo evento' },
      { href: '#/anuncios/nuevo', icon: 'megaphone', label: 'Nuevo anuncio' },
      { href: '#/predicas/nuevo', icon: 'play', label: 'Nueva prédica' },
      { href: '#/galeria/nuevo', icon: 'image', label: 'Subir fotografía' },
    ];

    body.replaceChildren(
      h('div', { class: 'stats' },
        statTile('Visitas (30 días)', sum(series, 'page_views'), sum(prevSeries, 'page_views')),
        statTile('Contactos (30 días)', sum(series, 'leads'), sum(prevSeries, 'leads'), 'WhatsApp, teléfono y correo'),
        h('a', { class: `stat stat--link ${pending ? 'stat--alert' : ''}`, href: '#/oracion' },
          h('p', { class: 'stat__label' }, 'Peticiones pendientes'),
          h('p', { class: 'stat__value' }, String(pending)),
          h('p', { class: 'stat__hint' }, pending ? 'Revisar ahora →' : 'Todo al día')),
        statTile('Eventos próximos', upcoming),
        statTile('Publicaciones activas', sermons + posts + photos, undefined, `${sermons} prédicas · ${posts} anuncios · ${photos} fotos`),
      ),
      h('div', { class: 'grid-2 grid-2--wide' },
        h('section', { class: 'card' },
          h('div', { class: 'card__head' }, h('h2', { class: 'card__title' }, 'Visitas por día (últimos 30 días)'),
            h('a', { href: '#/metricas', class: 'linkbtn' }, 'Ver métricas →')),
          columnChart(toPoints(series, 'page_views', 'day'), { title: 'Visitas por día, últimos 30 días', unit: 'Visitas', height: 220 })),
        h('div', { class: 'stack' },
          h('section', { class: 'card' },
            h('h2', { class: 'card__title' }, 'Accesos rápidos'),
            h('div', { class: 'quick' }, quick.map((q) => h('a', { class: 'quick__item', href: q.href }, icon(q.icon, 20), q.label)))),
          h('section', { class: 'card' },
            h('div', { class: 'card__head' }, h('h2', { class: 'card__title' }, 'Próximos eventos'), h('a', { href: '#/eventos', class: 'linkbtn' }, 'Todos →')),
            nextEvents.data?.length
              ? h('ul', { class: 'mini-list' }, nextEvents.data.map((e: any) =>
                  h('li', null, h('a', { href: `#/eventos/${encodeURIComponent(e.id)}` }, e.title),
                    h('span', { class: 'muted small' }, `${fmtDate(e.date)}${e.time ? ' · ' + fmtTime(e.time) : ''}`))))
              : h('p', { class: 'muted small' }, 'No hay eventos próximos registrados.')),
        ),
      ),
    );
  } catch (err) {
    body.replaceChildren(errorState(friendlyError(err), () => renderDashboard(root)));
  }
}
