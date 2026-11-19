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
