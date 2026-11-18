import type { SiteInfo } from './types';

export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** "17:30" → "5:30 PM" */
export function formatTime(t?: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

/** "2025-12-20" → "20 de diciembre de 2025" */
export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${day} de ${MONTH_NAMES[m - 1].toLowerCase()} de ${y}`;
}

export const links = (s: SiteInfo) => ({
  whatsapp: `https://wa.me/${s.whatsapp}?text=${encodeURIComponent('¡Hola! Me gustaría recibir información sobre la Comunidad Evangélica La Cosecha.')}`,
  phone: `tel:${s.phone.replace(/\s/g, '')}`,
  email: `mailto:${s.email}`,
  maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address + ', Nicaragua')}`,
  mapEmbed: `https://maps.google.com/maps?q=${encodeURIComponent('Gasolinera UNO, Juigalpa, Chontales, Nicaragua')}&z=15&output=embed`,
});

export const coordsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
