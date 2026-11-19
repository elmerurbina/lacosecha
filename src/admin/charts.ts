/**
 * Gráficos SVG livianos, sin dependencias (RNF-24).
 * Una sola serie por gráfico (sin leyenda, el título la nombra), una sola escala,
 * marcas delgadas con extremos redondeados de 4 px anclados a la línea base,
 * rejilla recesiva, tooltip al pasar el cursor/enfocar y tabla alternativa accesible.
 */
import { h, fmtNum } from './dom';

export interface Point { label: string; full: string; value: number }

const SVG = 'http://www.w3.org/2000/svg';
const s = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

function niceMax(v: number): number {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Columnas verticales (serie temporal). */
export function columnChart(points: Point[], opts: { title: string; unit: string; height?: number }) {
  const height = opts.height ?? 240;
  const tooltip = h('div', { class: 'chart__tip', role: 'status', 'aria-live': 'polite' });
  const svgHost = h('div', { class: 'chart__plot' });
  const total = points.reduce((a, p) => a + p.value, 0);
  const peak = points.reduce((a, p) => (p.value > a.value ? p : a), points[0] ?? { value: 0, full: '', label: '' });

  const table = h('table', { class: 'table table--compact' },
    h('caption', { class: 'sr-only' }, opts.title),
    h('thead', null, h('tr', null, h('th', { scope: 'col' }, 'Periodo'), h('th', { scope: 'col' }, opts.unit))),
    h('tbody', null, points.map((p) => h('tr', null, h('td', null, p.full), h('td', null, fmtNum(p.value))))));
  const tableWrap = h('div', { class: 'chart__table', hidden: true }, table);
  const toggle = h('button', { type: 'button', class: 'linkbtn', 'aria-expanded': 'false',
    onclick: () => { tableWrap.hidden = !tableWrap.hidden; toggle.setAttribute('aria-expanded', String(!tableWrap.hidden)); toggle.textContent = tableWrap.hidden ? 'Ver como tabla' : 'Ocultar tabla'; } },
  'Ver como tabla');

  const draw = () => {
    const width = Math.max(280, svgHost.clientWidth);
    const m = { top: 12, right: 8, bottom: 26, left: 40 };
    const iw = width - m.left - m.right;
    const ih = height - m.top - m.bottom;
    const max = niceMax(Math.max(1, ...points.map((p) => p.value)));
    const svg = s('svg', { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img',
      'aria-label': `${opts.title}. Total ${fmtNum(total)} ${opts.unit.toLowerCase()}${peak?.value ? `; máximo ${fmtNum(peak.value)} en ${peak.full}` : ''}.` });

    // Rejilla y eje Y
    for (let i = 0; i <= 4; i++) {
      const y = m.top + ih - (ih * i) / 4;
      svg.append(s('line', { x1: m.left, x2: width - m.right, y1: y, y2: y, class: i === 0 ? 'chart__base' : 'chart__grid' }));
      const t = s('text', { x: m.left - 8, y: y + 4, class: 'chart__axis', 'text-anchor': 'end' });
      t.textContent = fmtNum(Math.round((max * i) / 4));
      svg.append(t);
    }

    const n = points.length || 1;
    const slot = iw / n;
    const gap = Math.max(2, Math.min(slot * 0.3, 10));
    const bw = Math.max(2, slot - gap);
    const labelEvery = Math.ceil(n / Math.max(1, Math.floor(iw / 46)));
    const bars: (SVGPathElement | null)[] = [];

    points.forEach((p, i) => {
      const x = m.left + i * slot + gap / 2;
      const bh = (p.value / max) * ih;
      const y = m.top + ih - bh;
      const r = Math.min(4, bw / 2, bh);
      // Barra con extremo superior redondeado (4 px) y base recta sobre el eje
      const bar = bh > 0 ? s('path', {
        class: 'chart__bar',
        d: `M${x},${m.top + ih} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${m.top + ih} Z`,
      }) : null;
      if (bar) svg.append(bar);
      bars.push(bar);
      // Zona de interacción más grande que la marca
      const hit = s('rect', { x: m.left + i * slot, y: m.top, width: slot, height: ih, class: 'chart__hit', tabindex: 0,
        'aria-label': `${p.full}: ${fmtNum(p.value)} ${opts.unit.toLowerCase()}` });
      const show = () => {
        tooltip.replaceChildren(h('strong', null, fmtNum(p.value)), ` ${opts.unit.toLowerCase()} · ${p.full}`);
        tooltip.style.left = `${Math.min(width - 150, Math.max(0, x + bw / 2 - 75))}px`;
        tooltip.classList.add('is-on');
        bars.forEach((b) => b?.classList.toggle('is-hover', b === bars[i]));
      };
      hit.addEventListener('mouseenter', show);
      hit.addEventListener('focus', show);
      const hide = () => { tooltip.classList.remove('is-on'); bars[i]?.classList.remove('is-hover'); };
      hit.addEventListener('mouseleave', hide);
      hit.addEventListener('blur', hide);
      svg.append(hit);

      if (i % labelEvery === 0) {
        const t = s('text', { x: x + bw / 2, y: height - 8, class: 'chart__axis', 'text-anchor': 'middle' });
        t.textContent = p.label;
        svg.append(t);
      }
    });
    svgHost.replaceChildren(svg);
  };

  const box = h('figure', { class: 'chart' },
    h('div', { class: 'chart__stage' }, svgHost, tooltip),
    h('figcaption', { class: 'chart__foot' }, toggle),
    tableWrap);
  new ResizeObserver(() => draw()).observe(svgHost);
  return box;
}

/** Barras horizontales (ranking por categoría) en HTML. */
export function barList(items: { label: string; value: number }[], unit: string, empty = 'Sin datos en este periodo.') {
  if (!items.length || items.every((i) => !i.value)) return h('p', { class: 'muted small' }, empty);
  const max = Math.max(...items.map((i) => i.value));
  return h('ul', { class: 'barlist' }, items.map((i) =>
    h('li', null,
      h('div', { class: 'barlist__row' }, h('span', { class: 'barlist__label' }, i.label), h('span', { class: 'barlist__value' }, `${fmtNum(i.value)}`)),
      h('div', { class: 'barlist__track', role: 'img', 'aria-label': `${i.label}: ${fmtNum(i.value)} ${unit}` },
        h('div', { class: 'barlist__fill', style: `width: ${Math.max(1.5, (i.value / max) * 100)}%` })),
    )));
}

/** Tarjeta de indicador con variación respecto al periodo anterior. */
export function statTile(label: string, value: number, prev?: number, hint?: string) {
  let delta: Node | null = null;
  if (prev !== undefined) {
    if (prev === 0 && value === 0) delta = h('span', { class: 'stat__delta' }, 'Sin cambios');
    else if (prev === 0) delta = h('span', { class: 'stat__delta stat__delta--up' }, '▲ nuevo');
    else {
      const pct = Math.round(((value - prev) / prev) * 100);
      delta = h('span', { class: `stat__delta ${pct > 0 ? 'stat__delta--up' : pct < 0 ? 'stat__delta--down' : ''}` },
        `${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct)}% vs. periodo anterior`);
    }
  }
  return h('div', { class: 'stat' },
    h('p', { class: 'stat__label' }, label),
    h('p', { class: 'stat__value' }, fmtNum(value)),
    delta, hint ? h('p', { class: 'stat__hint' }, hint) : null);
}
