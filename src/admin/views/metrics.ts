/** Métricas y estadísticas con filtros temporales (RF-35, RF-36). */
import { friendlyError } from '../sb';
import { h, loading, errorState } from '../dom';
import { columnChart, barList, statTile } from '../charts';
import { fetchSeries, fetchBreakdown, toPoints, sum, rangeFor, CHANNEL_LABELS, type Period, type SeriesRow } from '../metrics-data';

const PERIODS: { id: Period; label: string }[] = [
  { id: 'day', label: 'Hoy' },
  { id: 'week', label: '7 días' },
  { id: 'month', label: '30 días' },
  { id: 'year', label: '12 meses' },
];

const SERIES: { key: keyof Omit<SeriesRow, 'bucket'>; label: string; unit: string }[] = [
  { key: 'page_views', label: 'Visitas', unit: 'Visitas' },
  { key: 'visitors', label: 'Visitantes', unit: 'Visitantes' },
  { key: 'sessions', label: 'Sesiones', unit: 'Sesiones' },
  { key: 'leads', label: 'Contactos', unit: 'Contactos' },
  { key: 'social', label: 'Redes sociales', unit: 'Clics' },
  { key: 'prayers', label: 'Peticiones', unit: 'Peticiones' },
];

const PAGE_LABELS: Record<string, string> = {
  '/': 'Inicio', '/quienes-somos': 'Quiénes somos', '/ministerios': 'Ministerios', '/horarios': 'Horarios',
  '/eventos': 'Eventos', '/predicas': 'Prédicas', '/contacto': 'Contacto', '/privacidad': 'Privacidad',
};

let period: Period = 'month';
let seriesKey: (typeof SERIES)[number]['key'] = 'page_views';

export function renderMetrics(root: HTMLElement) {
  const body = h('div');
  const periodBtns = PERIODS.map((p) => h('button', { type: 'button', 'aria-pressed': String(p.id === period),
    onclick: () => { period = p.id; periodBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(PERIODS[i].id === period))); load(); } }, p.label));

  root.replaceChildren(
    h('header', { class: 'page-head' },
      h('div', null, h('h1', null, 'Métricas'), h('p', { class: 'page-head__desc' }, 'Actividad del sitio: visitas, contactos, redes sociales y peticiones. Datos anónimos.')),
      h('div', { class: 'segmented', role: 'group', 'aria-label': 'Periodo' }, periodBtns)),
    body,
  );

  let seq = 0;
  async function load() {
    const ticket = ++seq;
    body.replaceChildren(loading('Calculando métricas…'));
    try {
      const [cur, prev, bd, bdPrev] = await Promise.all([
        fetchSeries(period), fetchSeries(period, 1), fetchBreakdown(period), fetchBreakdown(period, 1),
      ]);
      if (ticket !== seq) return; // llegó una respuesta de un filtro anterior
      const { bucket } = rangeFor(period);

      const chartHost = h('div');
      const seriesBtns = SERIES.map((sr) => h('button', { type: 'button', 'aria-pressed': String(sr.key === seriesKey),
        onclick: () => { seriesKey = sr.key; seriesBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(SERIES[i].key === seriesKey))); drawChart(); } }, sr.label));
      const chartTitle = h('h2', { class: 'card__title' });
      const drawChart = () => {
        const sr = SERIES.find((x) => x.key === seriesKey)!;
        chartTitle.textContent = `${sr.label} por ${bucket === 'hour' ? 'hora' : bucket === 'day' ? 'día' : 'mes'}`;
        chartHost.replaceChildren(columnChart(toPoints(cur, sr.key, bucket), { title: chartTitle.textContent, unit: sr.unit }));
      };
      drawChart();

      body.replaceChildren(
        h('div', { class: 'stats' },
          statTile('Visitas', sum(cur, 'page_views'), sum(prev, 'page_views')),
          statTile('Visitantes únicos', bd.visitors, bdPrev.visitors),
          statTile('Sesiones', bd.sessions, bdPrev.sessions),
          statTile('Contactos (leads)', sum(cur, 'leads'), sum(prev, 'leads'), 'WhatsApp, teléfono y correo'),
          statTile('Clics a redes', sum(cur, 'social'), sum(prev, 'social')),
          statTile('Peticiones de oración', sum(cur, 'prayers'), sum(prev, 'prayers')),
        ),
        h('section', { class: 'card' },
          h('div', { class: 'card__head' }, chartTitle,
            h('div', { class: 'segmented segmented--sm', role: 'group', 'aria-label': 'Indicador del gráfico' }, seriesBtns)),
          chartHost),
        h('div', { class: 'grid-2' },
          h('section', { class: 'card' },
            h('h2', { class: 'card__title' }, 'Interacciones con botones de contacto y redes'),
            barList(bd.clicks.map((c) => ({ label: CHANNEL_LABELS[c.label] ?? c.label, value: c.value })), 'clics')),
          h('section', { class: 'card' },
            h('h2', { class: 'card__title' }, 'Páginas más visitadas'),
            barList(bd.pages.map((p) => ({ label: PAGE_LABELS[p.label] ?? p.label, value: p.value })), 'visitas')),
        ),
        h('p', { class: 'muted small' }, 'Visitantes y sesiones se calculan con identificadores anónimos del navegador; no se guardan datos personales.'),
      );
    } catch (err) {
      if (ticket === seq) body.replaceChildren(errorState(friendlyError(err), load));
    }
  }
  load();
}
