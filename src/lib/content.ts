/**
 * Capa de acceso a contenido.
 *
 * Si las variables SUPABASE_URL y SUPABASE_ANON_KEY están definidas (ver `env` en
 * astro.config.mjs), el contenido publicado se obtiene de Supabase (PostgREST, protegido por RLS)
 * y lo que se edita en el panel administrativo aparece en el sitio (RF-37).
 * Si no están definidas o la consulta falla, se usan los datos de `src/data/seed.ts`.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_KEY } from 'astro:env/client';
import * as seed from '../data/seed';
import type {
  AboutSection, Announcement, CellGroup, ChurchEvent, GalleryItem, Ministry, Schedule, Sermon, SiteInfo,
} from './types';

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Caché corta en memoria para no repetir la misma consulta dentro de un render.
const cache = new Map<string, { at: number; value: Promise<unknown> }>();
const TTL = 15_000;

async function request<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
  return (await res.json()) as T[];
}

/** Devuelve las filas de Supabase; usa los datos locales solo si Supabase no está disponible. */
async function fromSupabase<T>(table: string, query: string, fallback: T[]): Promise<T[]> {
  if (!supabaseEnabled) return fallback;
  const key = `${table}?${query}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.value as Promise<T[]>;
  const value = request<T>(table, query).catch((err) => {
    console.warn(`[content] Usando datos locales para "${table}":`, (err as Error).message);
    cache.delete(key);
    return fallback;
  });
  cache.set(key, { at: Date.now(), value });
  return value;
}

type Settings = Partial<SiteInfo> & { prayerNote?: string };

async function getSettings(): Promise<Settings> {
  const rows = await fromSupabase<{ data: Settings }>('site_settings', 'select=data&id=eq.1', []);
  return rows[0]?.data ?? {};
}

export async function getSiteInfo(): Promise<SiteInfo> {
  const s = await getSettings();
  const clean = Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null && v !== '')) as Settings;
  const info: SiteInfo = { ...seed.siteInfo, ...clean, social: { ...seed.siteInfo.social, ...(clean.social ?? {}) } };
  // Imagen principal: la de ajustes o, si no hay, la foto más reciente marcada como "hero".
  if (!clean.heroImage && supabaseEnabled) {
    const hero = await fromSupabase<{ image: string }>('gallery', 'select=image&category=eq.hero&published=eq.true&order=created_at.desc&limit=1', []);
    if (hero[0]?.image) info.heroImage = hero[0].image;
  }
  return info;
}

export async function getPrayerNote(): Promise<string> {
  return (await getSettings()).prayerNote ?? seed.prayerNote;
}

export const getSchedules = () =>
  fromSupabase<Schedule>('schedules', 'select=id,title,day,time,description,featured&published=eq.true&order=day,time', seed.schedules)
    .then((rows) => rows.map((r) => ({ ...r, time: r.time.slice(0, 5) })));

export const getAboutSections = () =>
  fromSupabase<AboutSection>('about_sections', 'select=id,eyebrow,title,subtitle,body,list,image&order=position', seed.aboutSections);

export const getMinistries = () =>
  fromSupabase<Ministry>('ministries', 'select=id,name,summary,description,leaders,activities,icon,image&published=eq.true&order=position', seed.ministries);

export const getCellGroups = () =>
  fromSupabase<CellGroup>('cell_groups', 'select=id,host,lat,lng&published=eq.true&order=position', seed.cellGroups);

export const getEvents = () =>
  fromSupabase<ChurchEvent>('events', 'select=id,title,description,date,time,location,image&published=eq.true&order=date', seed.events)
    .then((rows) => rows.map((r) => ({ ...r, time: r.time?.slice(0, 5) })));

export const getAnnouncements = () =>
  fromSupabase<Announcement>('announcements', 'select=id,title,body,date,image,featured&published=eq.true&order=date.desc', seed.announcements);

export const getGallery = () =>
  fromSupabase<GalleryItem>('gallery', 'select=id,title,description,image,featured&published=eq.true&category=in.(general,destacada)&order=created_at.desc', seed.gallery);

export const getSermons = () =>
  fromSupabase<Sermon>('sermons', 'select=id,title,description,preacher,date,videoUrl:video_url,facebookUrl:facebook_url,cover&published=eq.true&order=date.desc', seed.sermons);
