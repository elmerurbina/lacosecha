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
  // Con coordenadas (capturadas por GPS desde el panel) el punto cae exactamente en el templo;
  // sin ellas se busca la dirección escrita, que Google ubica de forma aproximada.
  maps: hasCoords(s.location)
    ? `https://www.google.com/maps/search/?api=1&query=${s.location.lat},${s.location.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address + ', Nicaragua')}`,
  directions: hasCoords(s.location)
    ? `https://www.google.com/maps/dir/?api=1&destination=${s.location.lat},${s.location.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(s.address + ', Nicaragua')}`,
  mapEmbed: hasCoords(s.location)
    ? `https://maps.google.com/maps?q=${s.location.lat},${s.location.lng}&z=17&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(s.address + ', Nicaragua')}&z=16&output=embed`,
});

export function hasCoords(c: unknown): c is { lat: number; lng: number } {
  const o = c as { lat?: unknown; lng?: unknown } | null | undefined;
  return !!o && Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lng))
    && o.lat !== null && o.lng !== null && Math.abs(Number(o.lat)) <= 90 && Math.abs(Number(o.lng)) <= 180;
}

export const coordsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
