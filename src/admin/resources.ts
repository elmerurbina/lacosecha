/**
 * Definición declarativa de los catálogos administrables.
 * Agregar un nuevo módulo = agregar un objeto aquí (RNF-36/37).
 */
import { h, fmtDate, fmtTime, DAYS } from './dom';

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'date' | 'time' | 'select' | 'checkbox' | 'list' | 'image' | 'video' | 'url' | 'geo';

export interface Field {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  max?: number;
  min?: number;
  step?: string;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  folder?: string;
  pattern?: string;
  full?: boolean;
  /** Solo para type "geo": columnas donde se guardan latitud y longitud. */
  latKey?: string;
  lngKey?: string;
}

export interface Column {
  key: string;
  label: string;
  render?: (row: Row) => Node | string;
}

export type Row = Record<string, any>;

export interface Resource {
  path: string;
  table: string;
  title: string;
  singular: string;
  icon: string;
  /** "slug": id de texto generado desde `slugFrom`; "uuid": lo genera la base de datos */
  idType: 'slug' | 'uuid';
  slugFrom?: string;
  order: { column: string; ascending: boolean }[];
  columns: Column[];
  fields: Field[];
  search: string[];
  defaults: Row;
  hasPublish?: boolean;
  description?: string;
  validate?: (row: Row) => string | null;
}

const thumb = (url?: string | null) =>
  url
    ? h('img', { class: 'thumb', src: url, alt: '', loading: 'lazy',
        onerror: (e: Event) => (e.target as HTMLElement).replaceWith(h('span', { class: 'thumb thumb--empty', 'aria-hidden': 'true' })) })
    : h('span', { class: 'thumb thumb--empty', 'aria-hidden': 'true' });

const ICON_OPTIONS = [
  ['flame', 'Llama (jóvenes)'], ['book', 'Libro (enseñanza)'], ['sprout', 'Brote (discipulado)'],
  ['heart', 'Corazón (servicio)'], ['megaphone', 'Megáfono (evangelismo)'], ['music', 'Música (alabanza)'],
  ['hands', 'Manos (oración)'], ['monitor', 'Pantalla (multimedia)'], ['users', 'Personas (general)'],
].map(([value, label]) => ({ value, label }));

const published: Field = { key: 'published', label: 'Publicado (visible en el sitio)', type: 'checkbox' };

export const RESOURCES: Resource[] = [
  {
    path: 'horarios', table: 'schedules', title: 'Horarios de culto', singular: 'horario', icon: 'clock',
    description: 'Cultos, reuniones y actividades semanales. Se muestran en Inicio, Horarios y el calendario.',
    idType: 'slug', slugFrom: 'title',
    order: [{ column: 'day', ascending: true }, { column: 'time', ascending: true }],
    search: ['title', 'description'],
    defaults: { day: 0, time: '18:00', featured: false, published: true },
    hasPublish: true,
    columns: [
      { key: 'title', label: 'Actividad' },
      { key: 'day', label: 'Día', render: (r) => DAYS[r.day] },
      { key: 'time', label: 'Hora', render: (r) => fmtTime(r.time) },
    ],
    fields: [
      { key: 'title', label: 'Nombre de la actividad', type: 'text', required: true, max: 80, full: true },
      { key: 'day', label: 'Día', type: 'select', required: true, options: DAYS.map((d, i) => ({ value: String(i), label: d })) },
      { key: 'time', label: 'Hora', type: 'time', required: true },
      { key: 'description', label: 'Descripción breve', type: 'textarea', max: 200, full: true },
      { key: 'featured', label: 'Destacar (culto principal)', type: 'checkbox' },
      published,
    ],
  },
  {
    path: 'ministerios', table: 'ministries', title: 'Ministerios', singular: 'ministerio', icon: 'users',
    description: 'Catálogo de ministerios con su descripción, responsables y actividades.',
    idType: 'slug', slugFrom: 'name',
    order: [{ column: 'position', ascending: true }],
    search: ['name', 'summary'],
    defaults: { icon: 'users', position: 0, leaders: [], activities: [], published: true },
    hasPublish: true,
    columns: [
      { key: 'image', label: '', render: (r) => thumb(r.image) },
      { key: 'name', label: 'Ministerio' },
      { key: 'leaders', label: 'Responsables', render: (r) => (r.leaders ?? []).join(', ') || '—' },
      { key: 'position', label: 'Orden' },
    ],
    fields: [
      { key: 'name', label: 'Nombre', type: 'text', required: true, max: 80, full: true },
      { key: 'summary', label: 'Resumen (se ve en la tarjeta)', type: 'text', required: true, max: 140, full: true },
      { key: 'description', label: 'Descripción completa (botón «Ver más»)', type: 'textarea', required: true, max: 1500, full: true },
      { key: 'leaders', label: 'Responsables', type: 'list', help: 'Uno por línea.' },
      { key: 'activities', label: 'Actividades', type: 'list', help: 'Una por línea. Ej.: Reunión · Viernes 6:00 PM' },
      { key: 'icon', label: 'Ícono', type: 'select', options: ICON_OPTIONS },
      { key: 'position', label: 'Orden de aparición', type: 'number', min: 0, max: 999 },
      { key: 'image', label: 'Imagen representativa', type: 'image', folder: 'ministerios', full: true },
      published,
    ],
  },
  {
    path: 'celulas', table: 'cell_groups', title: 'Células', singular: 'célula', icon: 'pin',
    description: 'Grupos de crecimiento en hogares. Se muestran en la página «Células» con su foto, descripción y ubicación.',
    idType: 'slug', slugFrom: 'title',
    order: [{ column: 'position', ascending: true }],
    search: ['title', 'host'],
    defaults: { position: 0, published: true },
    hasPublish: true,
    columns: [
      { key: 'image', label: '', render: (r) => thumb(r.image) },
      { key: 'title', label: 'Célula', render: (r) => r.title || `Célula ${r.host}` },
      { key: 'host', label: 'Anfitrión' },
      { key: 'lat', label: 'Ubicación', render: (r) => (r.lat === null || r.lng === null ? 'Sin ubicación'
        : h('a', { href: `https://www.google.com/maps/search/?api=1&query=${Number(r.lat)},${Number(r.lng)}`, target: '_blank', rel: 'noopener' }, 'Ver en mapa')) },
    ],
    fields: [
      { key: 'title', label: 'Título (ej.: Célula Hna. Dalia)', type: 'text', required: true, max: 100, full: true },
      { key: 'host', label: 'Anfitrión (ej.: Hna. Dalia)', type: 'text', required: true, max: 80 },
      { key: 'meeting', label: 'Día y hora de reunión (opcional)', type: 'text', max: 80, placeholder: 'Jueves · 7:00 PM' },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 1200, full: true, help: 'Qué hacen, a quién está dirigida, referencias del barrio…' },
      { key: 'image', label: 'Foto de la célula', type: 'image', folder: 'celulas', full: true },
      { key: 'geo', label: 'Ubicación del hogar', type: 'geo', latKey: 'lat', lngKey: 'lng', full: true,
        help: 'Lo más exacto: estando en la casa, toca «Usar mi ubicación actual» desde el teléfono.' },
      { key: 'position', label: 'Orden de aparición', type: 'number', min: 0, max: 999 },
      published,
    ],
  },
  {
    path: 'eventos', table: 'events', title: 'Eventos', singular: 'evento', icon: 'calendar',
    description: 'Los eventos publicados aparecen automáticamente en el calendario y en «Próximos eventos».',
    idType: 'uuid',
    order: [{ column: 'date', ascending: false }],
    search: ['title', 'location'],
    defaults: { published: true },
    hasPublish: true,
    columns: [
      { key: 'image', label: '', render: (r) => thumb(r.image) },
      { key: 'title', label: 'Evento' },
      { key: 'date', label: 'Fecha', render: (r) => `${fmtDate(r.date)}${r.time ? ' · ' + fmtTime(r.time) : ''}` },
      { key: 'location', label: 'Lugar', render: (r) => r.location || '—' },
    ],
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true, max: 120, full: true },
      { key: 'date', label: 'Fecha', type: 'date', required: true },
      { key: 'time', label: 'Hora', type: 'time' },
      { key: 'location', label: 'Lugar', type: 'text', max: 160, full: true, placeholder: 'Templo La Cosecha' },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 2000, full: true },
      { key: 'image', label: 'Imagen', type: 'image', folder: 'eventos', full: true },
      published,
    ],
  },
  {
    path: 'anuncios', table: 'announcements', title: 'Anuncios', singular: 'anuncio', icon: 'megaphone',
    description: 'Comunicados institucionales. Los destacados aparecen primero.',
    idType: 'uuid',
    order: [{ column: 'date', ascending: false }],
    search: ['title', 'body'],
    defaults: { featured: false, published: false },
    hasPublish: true,
    columns: [
      { key: 'title', label: 'Anuncio', render: (r) => h('span', null, r.title, r.featured ? h('span', { class: 'tag tag--gold' }, 'Destacado') : null) },
      { key: 'date', label: 'Fecha', render: (r) => fmtDate(r.date) },
    ],
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true, max: 120, full: true },
      { key: 'body', label: 'Contenido', type: 'textarea', required: true, max: 2000, full: true },
      { key: 'date', label: 'Fecha de publicación', type: 'date', required: true },
      { key: 'featured', label: 'Destacar', type: 'checkbox' },
      { key: 'image', label: 'Imagen (opcional)', type: 'image', folder: 'anuncios', full: true },
      published,
    ],
  },
  {
    path: 'galeria', table: 'gallery', title: 'Galería y multimedia', singular: 'fotografía', icon: 'image',
    description: 'Fotografías de la galería general, destacadas, del Hero o de secciones institucionales.',
    idType: 'uuid',
    order: [{ column: 'created_at', ascending: false }],
    search: ['title', 'description'],
    defaults: { category: 'general', featured: false, published: true },
    hasPublish: true,
    columns: [
      { key: 'image', label: '', render: (r) => thumb(r.image) },
      { key: 'title', label: 'Título' },
      { key: 'category', label: 'Categoría', render: (r) => ({ general: 'Galería general', destacada: 'Destacada', hero: 'Hero (inicio)', institucional: 'Institucional' } as Row)[r.category] ?? r.category },
    ],
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true, max: 120, full: true },
      { key: 'description', label: 'Descripción (opcional)', type: 'textarea', max: 400, full: true },
      { key: 'category', label: 'Finalidad', type: 'select', required: true, options: [
        { value: 'general', label: 'Galería general' },
        { value: 'destacada', label: 'Fotografía destacada' },
        { value: 'hero', label: 'Imagen principal (Hero)' },
        { value: 'institucional', label: 'Sección institucional' },
      ], help: 'La imagen «Hero» más reciente se usa como portada del inicio.' },
      { key: 'featured', label: 'Mostrar primero en la galería', type: 'checkbox' },
      { key: 'image', label: 'Fotografía', type: 'image', folder: 'galeria', required: true, full: true },
      published,
    ],
  },
  {
    path: 'predicas', table: 'sermons', title: 'Prédicas', singular: 'prédica', icon: 'play',
    description: 'Videos MP4 o enlaces de Facebook. Sin archivo ni enlace se muestra como «contenido pendiente».',
    idType: 'uuid',
    order: [{ column: 'date', ascending: false }],
    search: ['title', 'preacher'],
    defaults: { published: false },
    hasPublish: true,
    columns: [
      { key: 'cover', label: '', render: (r) => thumb(r.cover) },
      { key: 'title', label: 'Prédica' },
      { key: 'date', label: 'Fecha', render: (r) => fmtDate(r.date) },
      { key: 'video_url', label: 'Medio', render: (r) => r.video_url ? 'MP4' : r.facebook_url ? 'Facebook' : h('span', { class: 'tag' }, 'Pendiente') },
    ],
    fields: [
      { key: 'title', label: 'Título', type: 'text', required: true, max: 160, full: true },
      { key: 'date', label: 'Fecha de publicación', type: 'date', required: true },
      { key: 'preacher', label: 'Predicador', type: 'text', max: 80 },
      { key: 'description', label: 'Descripción', type: 'textarea', max: 1500, full: true },
      { key: 'facebook_url', label: 'Enlace de Facebook', type: 'url', max: 500, full: true, pattern: '^https://(www\\.|m\\.)?facebook\\.com/.+', placeholder: 'https://www.facebook.com/…/videos/…', help: 'Pega el enlace de la publicación o video.' },
      { key: 'video_url', label: 'Archivo de video MP4 (máx. 50 MB)', type: 'video', folder: 'predicas', full: true },
      { key: 'cover', label: 'Imagen de portada', type: 'image', folder: 'predicas', full: true },
      published,
    ],
  },
];
