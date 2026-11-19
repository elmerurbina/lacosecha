/**
 * Constructor de campos de formulario con validación en cliente (RNF-17).
 * La base de datos vuelve a validar con CHECKs y RLS.
 */
import { h, icon, toast } from './dom';
import { friendlyError } from './sb';
import { uploadMedia, removeMedia, type MediaKind } from './upload';
import type { Field } from './resources';

export interface FieldControl {
  field: Field;
  el: HTMLElement;
  get(): unknown;
  validate(): string | null;
  focus(): void;
  showError(msg: string): void;
  /** URLs de archivos reemplazados que deben borrarse tras guardar */
  replaced(): string[];
  /** Archivos subidos que deben borrarse si se cancela */
  uploaded(): string[];
  /** Todos los archivos subidos en esta edición (para descartar si no se guarda) */
  discarded(): string[];
  busy(): boolean;
}

let uid = 0;

export function buildField(field: Field, value: unknown): FieldControl {
  const id = `f-${field.key}-${++uid}`;
  const errId = `${id}-err`;
  const helpId = `${id}-help`;
  const err = h('p', { class: 'field-error', id: errId });
  const help = field.help ? h('p', { class: 'field-help', id: helpId }, field.help) : null;
  const describedBy = [help ? helpId : '', errId].filter(Boolean).join(' ');
  const req = field.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null;
  const showError = (msg: string) => { err.textContent = msg; };

  const wrap = (control: HTMLElement, label = true) =>
    h('div', { class: `afield ${field.full ? 'afield--full' : ''} afield--${field.type}` },
      label ? h('label', { for: id }, field.label, req) : null,
      control, help, err);

  const base = { field, showError, replaced: () => [] as string[], uploaded: () => [] as string[], discarded: () => [] as string[], busy: () => false };

  switch (field.type) {
    case 'checkbox': {
      const input = h('input', { id, type: 'checkbox', checked: Boolean(value) });
      const el = h('div', { class: 'afield afield--full afield--check' }, input, h('label', { for: id }, field.label), help);
      return { ...base, el, get: () => input.checked, validate: () => null, focus: () => input.focus() };
    }
    case 'select': {
      const input = h('select', { id, required: field.required, 'aria-describedby': describedBy },
        field.options!.map((o) => h('option', { value: o.value, selected: String(value ?? '') === o.value }, o.label)));
      return {
        ...base, el: wrap(input), focus: () => input.focus(),
        get: () => (field.key === 'day' ? Number(input.value) : input.value),
        validate: () => (field.required && !input.value ? 'Selecciona una opción.' : null),
      };
    }
    case 'textarea':
    case 'list': {
      const text = field.type === 'list' ? ((value as string[]) ?? []).join('\n') : String(value ?? '');
      const input = h('textarea', { id, rows: field.type === 'list' ? 4 : 5, maxLength: field.max, required: field.required, 'aria-describedby': describedBy, placeholder: field.placeholder });
      input.value = text;
      const counter = field.max ? h('span', { class: 'counter', 'aria-hidden': 'true' }, `${text.length} / ${field.max}`) : null;
      input.addEventListener('input', () => { if (counter) counter.textContent = `${input.value.length} / ${field.max}`; });
      const el = wrap(input);
      if (counter) el.insertBefore(counter, err);
      return {
        ...base, el, focus: () => input.focus(),
        get: () => field.type === 'list'
          ? input.value.split('\n').map((s) => s.trim()).filter(Boolean)
          : input.value.trim() || null,
        validate: () => {
          const v = input.value.trim();
          if (field.required && !v) return 'Este campo es obligatorio.';
          if (field.max && v.length > field.max) return `Máximo ${field.max} caracteres.`;
          return null;
        },
      };
    }
    case 'image':
    case 'video':
      return mediaField(field, value as string | null, id, wrap, err);
    case 'geo':
      return geoField(field, value as GeoPoint | null, id, err, help, describedBy);
    case 'gallery':
      return galleryField(field, value as GalleryValue | null, id, err, help);
    default: {
      const type = field.type === 'url' ? 'url' : field.type;
      const input = h('input', {
        id, type, required: field.required, maxLength: field.max && field.type !== 'number' ? field.max : undefined,
        min: field.type === 'number' ? field.min : undefined, max: field.type === 'number' ? field.max : undefined,
        step: field.step, placeholder: field.placeholder, pattern: field.pattern, 'aria-describedby': describedBy,
      });
      input.value = value === null || value === undefined ? '' : String(value).slice(0, field.type === 'time' ? 5 : undefined);
      return {
        ...base, el: wrap(input), focus: () => input.focus(),
        get: () => {
          const v = input.value.trim();
          if (field.type === 'number') return v === '' ? null : Number(v);
          return v || null;
        },
        validate: () => {
          const v = input.value.trim();
          if (field.required && !v) return 'Este campo es obligatorio.';
          if (!v) return null;
          if (field.type === 'number') {
            const n = Number(v);
            if (Number.isNaN(n)) return 'Ingresa un número válido.';
            if (field.min !== undefined && n < field.min) return `El valor mínimo es ${field.min}.`;
            if (field.max !== undefined && n > field.max) return `El valor máximo es ${field.max}.`;
          } else if (field.max && v.length > field.max) return `Máximo ${field.max} caracteres.`;
          if (field.pattern && !new RegExp(field.pattern).test(v)) return 'El formato no es válido.';
          if (field.type === 'url' && !/^https:\/\//.test(v)) return 'El enlace debe comenzar con https://';
          return null;
        },
      };
    }
  }
}

function mediaField(field: Field, initial: string | null, id: string, wrap: (c: HTMLElement, label?: boolean) => HTMLElement, err: HTMLElement): FieldControl {
  const kind: MediaKind = field.type === 'video' ? 'video' : 'image';
  const original = initial ?? null;
  let current = original;
  let uploading = false;
  const uploadedUrls: string[] = [];

  const preview = h('div', { class: 'media__preview' });
  const input = h('input', { id, type: 'file', class: 'sr-only', accept: kind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : 'video/mp4' });
  const status = h('span', { class: 'media__status', role: 'status' });
  const removeBtn = h('button', { type: 'button', class: 'abtn abtn--ghost abtn--sm' }, icon('trash', 16), 'Quitar');
  const pickLabel = h('label', { for: id, class: 'abtn abtn--ghost abtn--sm' }, icon('upload', 16), kind === 'image' ? 'Subir imagen' : 'Subir video');

  const render = () => {
    preview.replaceChildren(
      current
        ? kind === 'image'
          ? h('img', { src: current, alt: 'Vista previa' })
          : h('video', { src: current, controls: true, preload: 'metadata' })
        : h('div', { class: 'media__empty' }, icon(kind === 'image' ? 'image' : 'play', 28), h('span', null, kind === 'image' ? 'Sin imagen' : 'Sin video')),
    );
    removeBtn.hidden = !current;
  };

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    err.textContent = '';
    uploading = true;
    status.textContent = kind === 'image' ? 'Optimizando y subiendo…' : 'Subiendo video…';
    pickLabel.classList.add('is-busy');
    try {
      const url = await uploadMedia(file, kind, field.folder ?? 'general');
      uploadedUrls.push(url);
      current = url;
      status.textContent = 'Archivo listo. Guarda para aplicar el cambio.';
      render();
    } catch (e) {
      const m = e instanceof Error && !('statusCode' in e) && !('code' in e) ? e.message : friendlyError(e);
      err.textContent = m;
      status.textContent = '';
      toast(m, 'error');
    } finally {
      uploading = false;
      pickLabel.classList.remove('is-busy');
    }
  });
  removeBtn.addEventListener('click', () => { current = null; status.textContent = ''; render(); });
  render();

  const el = wrap(h('div', { class: 'media' }, preview, h('div', { class: 'media__actions' }, pickLabel, input, removeBtn, status)), false);
  el.prepend(h('p', { class: 'afield__label' }, field.label, field.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null));

  return {
    field, el,
    get: () => current,
    focus: () => pickLabel.focus(),
    showError: (m) => { err.textContent = m; },
    validate: () => (uploading ? 'Espera a que termine la subida.' : field.required && !current ? 'Debes subir un archivo.' : null),
    replaced: () => (original && original !== current ? [original] : []),
    uploaded: () => uploadedUrls.filter((u) => u !== current),
    discarded: () => [...uploadedUrls],
    busy: () => uploading,
  };
}

/* ---------- Ubicación (latitud/longitud) con GPS del teléfono ---------- */
export type GeoPoint = { lat: number; lng: number };

export function geoValue(lat: unknown, lng: unknown): GeoPoint | null {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') return null;
  const p = { lat: Number(lat), lng: Number(lng) };
  return Number.isFinite(p.lat) && Number.isFinite(p.lng) ? p : null;
}

/** Extrae coordenadas de "12.09, -85.36" o de un enlace de Google Maps (@lat,lng · q=lat,lng · !3dlat!4dlng). */
export function parseCoords(text: string): GeoPoint | null {
  let t = text.trim();
  try { t = decodeURIComponent(t); } catch { /* texto no codificado */ }
  const num = String.raw`(-?\d+(?:\.\d+)?)`;
  const pats = [
    new RegExp(String.raw`!3d${num}!4d${num}`),
    new RegExp(String.raw`@${num},\s*${num}`),
    new RegExp(String.raw`[?&](?:q|query|destination|ll)=${num},\s*${num}`),
    new RegExp(String.raw`^${num}\s*[,\s]\s*${num}$`),
  ];
  for (const re of pats) {
    const m = t.match(re);
    if (m) {
      const p = { lat: Number(m[1]), lng: Number(m[2]) };
      if (Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180) return p;
    }
  }
  return null;
}

const roundCoord = (n: number) => Math.round(n * 1e9) / 1e9;

function geoField(field: Field, initial: GeoPoint | null, id: string, err: HTMLElement, help: HTMLElement | null, describedBy: string): FieldControl {
  const latIn = h('input', { id, type: 'number', step: 'any', min: -90, max: 90, placeholder: '12.104512', inputmode: 'decimal', 'aria-describedby': describedBy });
  const lngIn = h('input', { id: `${id}-lng`, type: 'number', step: 'any', min: -180, max: 180, placeholder: '-85.369871', inputmode: 'decimal', 'aria-describedby': describedBy });
  const pasteIn = h('input', { id: `${id}-paste`, type: 'text', placeholder: 'Pega coordenadas o un enlace de Google Maps', autocomplete: 'off' });
  const status = h('p', { class: 'geo__status', role: 'status', 'aria-live': 'polite' });
  const frame = h('iframe', { class: 'geo__map', title: 'Vista previa de la ubicación', loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade' });
  const empty = h('div', { class: 'geo__empty' }, icon('pin', 26), h('span', null, 'Sin ubicación todavía'));
  const openLink = h('a', { class: 'abtn abtn--ghost abtn--sm', target: '_blank', rel: 'noopener' }, icon('external', 16), 'Abrir en Google Maps');
  const gpsLabel = h('span', null, 'Usar mi ubicación actual');
  const gpsBtn = h('button', { type: 'button', class: 'abtn abtn--primary abtn--sm' }, icon('pin', 16), gpsLabel);
  const clearBtn = h('button', { type: 'button', class: 'abtn abtn--ghost abtn--sm' }, icon('trash', 16), 'Quitar');

  const read = (): GeoPoint | null => geoValue(latIn.value.trim(), lngIn.value.trim());

  let timer = 0;
  const paint = () => {
    const p = read();
    const ok = !!p && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
    frame.hidden = !ok; empty.hidden = ok; openLink.hidden = !ok; clearBtn.hidden = !ok;
    if (ok && p) {
      const src = `https://maps.google.com/maps?q=${p.lat},${p.lng}&z=18&output=embed`;
      if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
      openLink.href = `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    }
  };
  const refresh = () => { clearTimeout(timer); timer = window.setTimeout(paint, 350); };
  const set = (p: GeoPoint | null) => {
    latIn.value = p ? String(roundCoord(p.lat)) : '';
    lngIn.value = p ? String(roundCoord(p.lng)) : '';
    paint();
  };

  latIn.addEventListener('input', refresh);
  lngIn.addEventListener('input', refresh);
  pasteIn.addEventListener('input', () => {
    const p = parseCoords(pasteIn.value);
    if (p) {
      set(p);
      pasteIn.value = '';
      err.textContent = '';
      status.textContent = 'Coordenadas tomadas del texto pegado. Revisa el punto en el mapa y guarda.';
    }
  });
  clearBtn.addEventListener('click', () => { set(null); status.textContent = ''; });

  // GPS: se escuchan varias lecturas durante unos segundos y se conserva la más precisa.
  let watchId: number | null = null;
  let stopTimer = 0;
  let best: GeolocationPosition | null = null;
  const stop = (failMsg?: string) => {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    clearTimeout(stopTimer);
    gpsBtn.disabled = false;
    gpsLabel.textContent = 'Usar mi ubicación actual';
    if (best) {
      set({ lat: best.coords.latitude, lng: best.coords.longitude });
      const acc = Math.round(best.coords.accuracy);
      status.textContent = `Ubicación capturada (precisión ±${acc} m). Revisa el punto en el mapa y guarda.`
        + (acc > 30 ? ' La señal fue débil: si el punto no está bien, inténtalo de nuevo al aire libre.' : '');
    } else if (failMsg) {
      err.textContent = failMsg;
      status.textContent = '';
    }
  };

  gpsBtn.addEventListener('click', () => {
    err.textContent = '';
    if (!('geolocation' in navigator)) { err.textContent = 'Este dispositivo no permite obtener la ubicación.'; return; }
    if (!window.isSecureContext) { err.textContent = 'La ubicación solo funciona en una conexión segura (https).'; return; }
    best = null;
    gpsBtn.disabled = true;
    gpsLabel.textContent = 'Buscando señal GPS…';
    status.textContent = 'Buscando tu ubicación… Mantente quieto, de preferencia al aire libre o cerca de una ventana.';
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        const acc = Math.round(best.coords.accuracy);
        status.textContent = `Afinando la ubicación… precisión actual ±${acc} m`;
        if (acc <= 10) stop();
      },
      (e) => {
        stop(e.code === e.PERMISSION_DENIED
          ? 'Permiso de ubicación denegado. Actívalo para este sitio en los ajustes del navegador e inténtalo de nuevo.'
          : e.code === e.TIMEOUT
            ? 'No se obtuvo señal a tiempo. Inténtalo de nuevo al aire libre.'
            : 'No se pudo obtener la ubicación. Verifica que el GPS del teléfono esté encendido.');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
    );
    // Como máximo 20 s: se usa la mejor lectura obtenida hasta entonces.
    stopTimer = window.setTimeout(() => stop('No se obtuvo señal GPS. Inténtalo de nuevo al aire libre.'), 20000);
  });

  const el = h('div', { class: 'afield afield--full afield--geo' },
    h('p', { class: 'afield__label' }, field.label, field.required ? h('span', { class: 'req', 'aria-hidden': 'true' }, ' *') : null),
    help,
    h('div', { class: 'geo' },
      h('div', { class: 'geo__preview' }, frame, empty),
      h('div', { class: 'geo__controls' },
        h('div', { class: 'geo__actions' }, gpsBtn, openLink, clearBtn),
        status,
        h('div', { class: 'geo__inputs' },
          h('div', null, h('label', { for: id }, 'Latitud'), latIn),
          h('div', null, h('label', { for: `${id}-lng` }, 'Longitud'), lngIn)),
        h('div', { class: 'geo__paste' },
          h('label', { for: `${id}-paste` }, 'O pega desde Google Maps'), pasteIn,
          h('p', { class: 'field-help' }, 'En Google Maps mantén presionado el punto exacto y copia las coordenadas o el enlace.')),
      ),
    ),
    err,
  );
  set(initial);

  return {
    field, el,
    get: () => { const p = read(); return p ? { lat: roundCoord(p.lat), lng: roundCoord(p.lng) } : null; },
    focus: () => gpsBtn.focus(),
    showError: (m) => { err.textContent = m; },
    validate: () => {
      if (watchId !== null) return 'Espera a que termine la búsqueda de GPS.';
      const a = latIn.value.trim(), b = lngIn.value.trim();
      if (!a && !b) return field.required ? 'Indica la ubicación.' : null;
      if (!a || !b) return 'Completa latitud y longitud.';
      const p = read();
      if (!p) return 'Las coordenadas no son válidas.';
      if (Math.abs(p.lat) > 90) return 'La latitud debe estar entre -90 y 90.';
      if (Math.abs(p.lng) > 180) return 'La longitud debe estar entre -180 y 180.';
      return null;
    },
    replaced: () => [], uploaded: () => [], discarded: () => [],
    busy: () => watchId !== null,
  };
}

/* ---------- Galería: varias fotos y videos con portada elegible ---------- */
export type MediaEntry = { url: string; type: 'image' | 'video' };
export type GalleryValue = { media: MediaEntry[]; cover: string | null };

const MAX_GALLERY = 30;

function galleryField(field: Field, initial: GalleryValue | null, id: string, err: HTMLElement, help: HTMLElement | null): FieldControl {
  const original = initial?.media ?? [];
  let items: MediaEntry[] = original.map((m) => ({ ...m }));
  let cover: string | null = initial?.cover ?? null;
  if (cover && !items.some((m) => m.url === cover)) cover = null;
  let pending = 0;
  const uploadedUrls: string[] = [];

  const grid = h('ul', { class: 'gal__grid', role: 'list' });
  const status = h('p', { class: 'gal__status', role: 'status', 'aria-live': 'polite' });
  const input = h('input', { id, type: 'file', class: 'sr-only', multiple: true, accept: 'image/jpeg,image/png,image/webp,image/avif,video/mp4' });
  const pick = h('label', { for: id, class: 'abtn abtn--primary abtn--sm' }, icon('upload', 16), 'Agregar fotos o videos');
  const count = h('span', { class: 'gal__count' });

  const firstImage = () => items.find((m) => m.type === 'image')?.url ?? null;
  const effectiveCover = () => cover ?? items[0]?.url ?? null;

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    render();
    (grid.children[j]?.querySelector(d < 0 ? '[data-left]' : '[data-right]') as HTMLElement | null)?.focus();
  };

  function render() {
    const cov = effectiveCover();
    grid.replaceChildren(...items.map((m, i) => {
      const isCover = m.url === cov;
      const kindLabel = m.type === 'video' ? 'Video' : 'Foto';
      const thumb = m.type === 'video'
        ? h('video', { src: `${m.url}#t=0.5`, muted: true, preload: 'metadata', playsInline: true })
        : h('img', { src: m.url, alt: '', loading: 'lazy' });
      return h('li', { class: `gal__item ${isCover ? 'is-cover' : ''}` },
        h('div', { class: 'gal__thumb' }, thumb,
          h('span', { class: 'gal__kind' }, icon(m.type === 'video' ? 'play' : 'image', 13), kindLabel),
          isCover ? h('span', { class: 'gal__badge' }, icon('star', 13), 'Portada') : null),
        h('div', { class: 'gal__tools' },
          h('button', {
            type: 'button', class: `abtn abtn--sm ${isCover ? 'abtn--primary' : 'abtn--ghost'}`,
            'aria-pressed': String(isCover), disabled: isCover,
            onclick: () => { cover = m.url; render(); status.textContent = `${kindLabel} ${i + 1} elegida como portada.`; },
          }, icon('star', 15), isCover ? 'Portada' : 'Usar de portada'),
          h('div', { class: 'gal__icons' },
            h('button', { type: 'button', class: 'gal__icon', 'data-left': '', 'aria-label': `Mover ${kindLabel.toLowerCase()} ${i + 1} a la izquierda`, disabled: i === 0, onclick: () => move(i, -1) }, icon('back', 16)),
            h('button', { type: 'button', class: 'gal__icon gal__icon--flip', 'data-right': '', 'aria-label': `Mover ${kindLabel.toLowerCase()} ${i + 1} a la derecha`, disabled: i === items.length - 1, onclick: () => move(i, 1) }, icon('back', 16)),
            h('button', {
              type: 'button', class: 'gal__icon gal__icon--danger', 'aria-label': `Quitar ${kindLabel.toLowerCase()} ${i + 1}`,
              onclick: () => {
                items.splice(i, 1);
                if (cover === m.url) cover = null;
                render();
                status.textContent = `${kindLabel} quitada. Guarda para aplicar el cambio.`;
              },
            }, icon('trash', 16)),
          ),
        ),
      );
    }), ...(pending ? Array.from({ length: pending }, () =>
      h('li', { class: 'gal__item gal__item--loading' }, h('div', { class: 'gal__thumb' }, h('span', { class: 'spinner', 'aria-hidden': 'true' })))) : []));
    if (!items.length && !pending) grid.replaceChildren(h('li', { class: 'gal__empty' }, icon('image', 28), h('span', null, 'Aún no hay fotos ni videos')));
    const photos = items.filter((m) => m.type === 'image').length;
    count.textContent = `${photos} ${photos === 1 ? 'foto' : 'fotos'} · ${items.length - photos} ${items.length - photos === 1 ? 'video' : 'videos'} · máx. ${MAX_GALLERY}`;
  }

  input.addEventListener('change', async () => {
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    err.textContent = '';
    const room = MAX_GALLERY - items.length - pending;
    if (room <= 0) { err.textContent = `Máximo ${MAX_GALLERY} archivos por ministerio.`; return; }
    const batch = files.slice(0, room);
    if (files.length > room) toast(`Solo se agregarán ${room} archivo(s): el máximo es ${MAX_GALLERY}.`, 'error');
    pending += batch.length;
    render();
    let ok = 0;
    const problems: string[] = [];
    for (const file of batch) {
      const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image';
      status.textContent = `Subiendo ${ok + problems.length + 1} de ${batch.length}${kind === 'image' ? ' (optimizando imagen)' : ''}…`;
      try {
        const url = await uploadMedia(file, kind, field.folder ?? 'general');
        uploadedUrls.push(url);
        items.push({ url, type: kind });
        ok++;
      } catch (e) {
        const m = e instanceof Error && !('statusCode' in e) && !('code' in e) ? e.message : friendlyError(e);
        problems.push(`${file.name}: ${m}`);
      } finally {
        pending--;
        render();
      }
    }
    status.textContent = ok ? `${ok} archivo(s) listo(s). Elige la portada y guarda para aplicar los cambios.` : '';
    if (problems.length) { err.textContent = problems.join(' · '); toast(problems[0], 'error'); }
  });

  render();

  const el = h('div', { class: 'afield afield--full afield--gallery' },
    h('p', { class: 'afield__label' }, field.label),
    help,
    h('div', { class: 'gal' },
      h('div', { class: 'gal__bar' }, pick, input, count),
      status,
      grid,
    ),
    err,
  );

  const currentUrls = () => new Set(items.map((m) => m.url));
  return {
    field, el,
    get: (): GalleryValue & { image: string | null } => {
      const cov = effectiveCover();
      const coverItem = items.find((m) => m.url === cov);
      return {
        media: items.map((m) => ({ url: m.url, type: m.type })),
        cover: cov,
        // Compatibilidad: "image" guarda la portada si es foto; si la portada es video, la primera foto.
        image: coverItem?.type === 'image' ? coverItem.url : firstImage(),
      };
    },
    focus: () => pick.focus(),
    showError: (m) => { err.textContent = m; },
    validate: () => (pending ? 'Espera a que terminen de subirse los archivos.' : null),
    replaced: () => { const cur = currentUrls(); return original.map((m) => m.url).filter((u) => !cur.has(u)); },
    uploaded: () => { const cur = currentUrls(); return uploadedUrls.filter((u) => !cur.has(u)); },
    discarded: () => [...uploadedUrls],
    busy: () => pending > 0,
  };
}

/** Valida todos los campos; muestra errores y enfoca el primero. */
export function validateAll(controls: FieldControl[]): boolean {
  let first: FieldControl | null = null;
  for (const c of controls) {
    const msg = c.validate();
    c.showError(msg ?? '');
    if (msg && !first) first = c;
  }
  first?.focus();
  return !first;
}

/** Limpia archivos huérfanos (subidos y luego reemplazados o cancelados). */
export function cleanupMedia(urls: string[]) {
  urls.forEach((u) => removeMedia(u));
}
