/** Consultas de métricas (RF-25, RF-35, RF-36) vía funciones RPC protegidas. */
import { sb } from './sb';
import type { Point } from './charts';

export type Period = 'day' | 'week' | 'month' | 'year';
export type Bucket = 'hour' | 'day' | 'month';

export interface SeriesRow {
  bucket: string; page_views: number; visitors: number; sessions: number; leads: number; social: number; prayers: number;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];

export function rangeFor(period: Period, shift = 0): { from: Date; to: Date; bucket: Bucket } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from: Date, to: Date, bucket: Bucket;
  switch (period) {
    case 'day': from = start; to = new Date(start.getTime() + 86_400_000); bucket = 'hour'; break;
    case 'week': from = new Date(start.getTime() - 6 * 86_400_000); to = new Date(start.getTime() + 86_400_000); bucket = 'day'; break;
    case 'month': from = new Date(start.getTime() - 29 * 86_400_000); to = new Date(start.getTime() + 86_400_000); bucket = 'day'; break;
    case 'year': from = new Date(now.getFullYear(), now.getMonth() - 11, 1); to = new Date(now.getFullYear(), now.getMonth() + 1, 1); bucket = 'month'; break;
  }
  if (shift) {
    if (period === 'year') { from = new Date(from.getFullYear() - shift, from.getMonth(), 1); to = new Date(to.getFullYear() - shift, to.getMonth(), 1); }
    else { const len = to.getTime() - from.getTime(); from = new Date(from.getTime() - len * shift); to = new Date(to.getTime() - len * shift); }
  }
  return { from, to, bucket };
}

export async function fetchSeries(period: Period, shift = 0): Promise<SeriesRow[]> {
  const { from, to, bucket } = rangeFor(period, shift);
  // p_to exclusivo: restar 1 ms para que la serie no incluya un bucket extra.
  const { data, error } = await sb.rpc('admin_metrics', { p_from: from.toISOString(), p_to: new Date(to.getTime() - 1).toISOString(), p_bucket: bucket });
  if (error) throw error;
  return ((data ?? []) as SeriesRow[]).map((r) => ({
    ...r, page_views: +r.page_views, visitors: +r.visitors, sessions: +r.sessions, leads: +r.leads, social: +r.social, prayers: +r.prayers,
  }));
}

export async function fetchBreakdown(period: Period, shift = 0) {
  const { from, to } = rangeFor(period, shift);
  const { data, error } = await sb.rpc('admin_metrics_breakdown', { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) throw error;
  const rows = (data ?? []) as { dimension: string; label: string; total: number }[];
  const by = (d: string) => rows.filter((r) => r.dimension === d).map((r) => ({ label: r.label, value: +r.total }));
  const totals = Object.fromEntries(by('totals').map((t) => [t.label, t.value]));
  return { visitors: totals.visitors ?? 0, sessions: totals.sessions ?? 0, clicks: by('click'), pages: by('page') };
}

export function toPoints(rows: SeriesRow[], key: keyof Omit<SeriesRow, 'bucket'>, bucket: Bucket): Point[] {
  return rows.map((r) => {
    const [d, t = '00:00'] = r.bucket.split(/[T ]/);
    const [y, mo, da] = d.split('-').map(Number);
    const date = new Date(y, mo - 1, da);
    const hour = Number(t.slice(0, 2));
    let label: string, full: string;
    if (bucket === 'hour') { label = `${hour}h`; full = `${hour}:00 – ${hour}:59`; }
    else if (bucket === 'day') { label = `${da}`; full = `${DAYS[date.getDay()]} ${da} ${MONTHS[mo - 1]}`; }
    else { label = MONTHS[mo - 1]; full = `${MONTHS[mo - 1]} ${y}`; }
    return { label, full, value: r[key] as number };
  });
}

export const sum = (rows: SeriesRow[], key: keyof Omit<SeriesRow, 'bucket'>) => rows.reduce((a, r) => a + (r[key] as number), 0);

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp', phone: 'Teléfono', email: 'Correo', maps: 'Mapa / cómo llegar',
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', otro: 'Otro',
};
