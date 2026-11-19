export interface SiteInfo {
  name: string;
  shortName: string;
  denomination: string;
  city: string;
  address: string;
  phone: string;
  /** Número en formato internacional sin "+" ni espacios, para wa.me */
  whatsapp: string;
  email: string;
  motto: string;
  mottoRef: string;
  description: string;
  founded: string;
  pastor: string;
  associatePastor: string;
  social: { facebook: string; instagram: string; tiktok: string };
  heroImage?: string | null;
  logo?: string | null;
  /** Coordenadas exactas del templo (se capturan con el GPS desde el panel). */
  location?: { lat: number; lng: number } | null;
}

export interface Schedule {
  id: string;
  title: string;
  /** 0 = domingo … 6 = sábado */
  day: number;
  /** HH:mm (24 h) */
  time: string;
  description?: string;
  featured?: boolean;
}

export interface AboutSection {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  list?: string[];
  image?: string | null;
}

export type IconName =
  | 'flame' | 'book' | 'sprout' | 'heart' | 'megaphone' | 'music' | 'hands' | 'monitor' | 'users';

export interface Ministry {
  id: string;
  name: string;
  summary: string;
  description: string;
  leaders: string[];
  activities: string[];
  icon: IconName;
  image?: string | null;
  /** Fotos y videos del ministerio, en el orden elegido en el panel. */
  media?: MediaItem[];
  /** URL del archivo (foto o video) usado como portada. */
  cover?: string | null;
}

export interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

export interface CellGroup {
  id: string;
  title?: string | null;
  host: string;
  description?: string | null;
  /** Día y hora de reunión, texto libre (ej.: "Jueves · 7:00 PM") */
  meeting?: string | null;
  image?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface ChurchEvent {
  id: string;
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time?: string;
  location?: string;
  image?: string | null;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  image?: string | null;
  featured?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  description?: string;
  image?: string | null;
  featured?: boolean;
}

export interface Sermon {
  id: string;
  title: string;
  description?: string;
  preacher?: string;
  /** YYYY-MM-DD */
  date: string;
  videoUrl?: string | null;
  facebookUrl?: string | null;
  cover?: string | null;
}
