/**
 * Capa de acceso a contenido.
 *
 * Si las variables SUPABASE_URL y SUPABASE_ANON_KEY están definidas (ver `env` en
 * astro.config.mjs), el contenido publicado se obtiene de Supabase (PostgREST, protegido por RLS).
 * Si no están definidas o la consulta falla, se usan los datos de `src/data/seed.ts`.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY as SUPABASE_KEY } from 'astro:env/client';
import * as seed from '../data/seed';
import type {
  AboutSection, Announcement, ChurchEvent, GalleryItem, Ministry, Schedule, Sermon, SiteInfo,
} from './types';

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

async function fromSupabase<T>(table: string, query: string, fallback: T[]): Promise<T[]> {
  if (!supabaseEnabled) return fallback;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: { apikey: SUPABASE_KEY!, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status}`);
    const rows = (await res.json()) as T[];
    return rows.length ? rows : fallback;
  } catch (err) {
    console.warn(`[content] Usando datos locales para "${table}":`, (err as Error).message);
    return fallback;
  }
}

export const getSiteInfo = async (): Promise<SiteInfo> => seed.siteInfo;

export const getSchedules = () =>
  fromSupabase<Schedule>('schedules', 'select=id,title,day,time,description,featured&published=eq.true&order=day,time', seed.schedules);

export const getAboutSections = () =>
  fromSupabase<AboutSection>('about_sections', 'select=id,eyebrow,title,subtitle,body,list,image&order=position', seed.aboutSections);

export const getMinistries = () =>
  fromSupabase<Ministry>('ministries', 'select=id,name,summary,description,leaders,activities,icon,image&published=eq.true&order=position', seed.ministries);

export const getEvents = () =>
  fromSupabase<ChurchEvent>('events', 'select=id,title,description,date,time,location,image&published=eq.true&order=date', seed.events);

export const getAnnouncements = () =>
  fromSupabase<Announcement>('announcements', 'select=id,title,body,date,image,featured&published=eq.true&order=date.desc', seed.announcements);

export const getGallery = () =>
  fromSupabase<GalleryItem>('gallery', 'select=id,title,description,image,featured&published=eq.true&order=created_at.desc', seed.gallery);

export const getSermons = () =>
  fromSupabase<Sermon>('sermons', 'select=id,title,description,preacher,date,videoUrl:video_url,facebookUrl:facebook_url,cover&published=eq.true&order=date.desc', seed.sermons);

export const getCellGroups = async () => seed.cellGroups;
export const prayerNote = seed.prayerNote;
