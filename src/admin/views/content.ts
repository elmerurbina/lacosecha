/**
 * Información institucional (RF-04, RF-27, sección 1.3):
 * datos generales del sitio y subsecciones de «Quiénes somos».
 */
import { sb, friendlyError } from '../sb';
import { h, icon, toast, loading, errorState } from '../dom';
import { buildField, validateAll, cleanupMedia, type FieldControl } from '../fields';
import type { Field, Row } from '../resources';

const SETTINGS_FIELDS: { title: string; fields: Field[] }[] = [
  {
    title: 'Identidad',
    fields: [
      { key: 'name', label: 'Nombre oficial', type: 'text', required: true, max: 120, full: true },
      { key: 'shortName', label: 'Nombre corto', type: 'text', required: true, max: 40 },
      { key: 'denomination', label: 'Denominación / cobertura', type: 'text', max: 80 },
      { key: 'description', label: 'Descripción (inicio, SEO y redes)', type: 'textarea', required: true, max: 600, full: true },
      { key: 'motto', label: 'Lema institucional', type: 'text', max: 160, full: true },
      { key: 'mottoRef', label: 'Referencia bíblica del lema', type: 'text', max: 40 },
      { key: 'founded', label: 'Fecha de fundación', type: 'date' },
      { key: 'pastor', label: 'Pastor general', type: 'text', max: 80 },
      { key: 'associatePastor', label: 'Pastora asociada', type: 'text', max: 80 },
    ],
  },
  {
    title: 'Contacto y ubicación',
    fields: [
      { key: 'phone', label: 'Teléfono (como se muestra)', type: 'text', required: true, max: 30, placeholder: '+505 8404 0236' },
      { key: 'whatsapp', label: 'WhatsApp (solo dígitos, con código de país)', type: 'text', required: true, max: 20, pattern: '^\\d{8,15}$', placeholder: '50584040236' },
      { key: 'email', label: 'Correo institucional', type: 'text', required: true, max: 120, pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$' },
      { key: 'city', label: 'Ciudad', type: 'text', max: 80 },
      { key: 'address', label: 'Dirección de referencia', type: 'textarea', required: true, max: 300, full: true },
      { key: 'location', label: 'Punto exacto del templo en el mapa', type: 'geo', full: true,
        help: 'Estando dentro del templo, abre este panel en el teléfono y toca «Usar mi ubicación actual». Así «Cómo llegar» y el mapa del sitio marcan la dirección exacta.' },
      { key: 'prayerNote', label: 'Nota de oración y ayuno (se muestra bajo los horarios)', type: 'text', max: 160, full: true },
    ],
  },
  {
    title: 'Redes sociales',
    fields: [
      { key: 'social.facebook', label: 'Facebook', type: 'url', max: 300, full: true },
      { key: 'social.instagram', label: 'Instagram', type: 'url', max: 300, full: true },
      { key: 'social.tiktok', label: 'TikTok', type: 'url', max: 300, full: true },
    ],
  },
  {
    title: 'Imágenes principales',
    fields: [
      { key: 'logo', label: 'Logotipo (cuadrado, fondo transparente)', type: 'image', folder: 'sitio' },
      { key: 'heroImage', label: 'Imagen principal del inicio (Hero)', type: 'image', folder: 'sitio' },
    ],
  },
];

const ABOUT_FIELDS: Field[] = [
  { key: 'eyebrow', label: 'Etiqueta', type: 'text', required: true, max: 40 },
  { key: 'title', label: 'Título', type: 'text', required: true, max: 120 },
  { key: 'subtitle', label: 'Subtítulo', type: 'text', max: 160, full: true },
  { key: 'body', label: 'Descripción', type: 'textarea', required: true, max: 2000, full: true },
  { key: 'list', label: 'Lista (opcional, uno por línea — p. ej. valores)', type: 'list', full: true },
  { key: 'image', label: 'Imagen representativa', type: 'image', folder: 'institucional', full: true },
];

const getPath = (obj: Row, path: string) => path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
const setPath = (obj: Row, path: string, v: unknown) => {
  const keys = path.split('.');
  let o = obj;
  keys.slice(0, -1).forEach((k) => { o[k] ??= {}; o = o[k]; });
  o[keys.at(-1)!] = v;
};

export async function renderContent(root: HTMLElement) {
  const tabs = [
    { id: 'general', label: 'Datos generales' },
    { id: 'about', label: 'Quiénes somos' },
  ];
  const panel = h('div', { class: 'tabpanel', role: 'tabpanel', id: 'content-panel' });
  const tabBtns = tabs.map((t, i) => h('button', {
    type: 'button', role: 'tab', id: `tab-${t.id}`, 'aria-controls': 'content-panel', 'aria-selected': String(i === 0), tabindex: i === 0 ? '0' : '-1',
    onclick: () => select(t.id),
  }, t.label));
  const tablist = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones de información' }, tabBtns);
  tablist.addEventListener('keydown', (e) => {
    const i = tabBtns.findIndex((b) => b === document.activeElement);
    if (i < 0 || !['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    const next = tabBtns[(i + (e.key === 'ArrowRight' ? 1 : tabBtns.length - 1)) % tabBtns.length];
    next.focus(); next.click();
  });

  function select(id: string) {
    tabBtns.forEach((b) => { const on = b.id === `tab-${id}`; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
    panel.setAttribute('aria-labelledby', `tab-${id}`);
    if (id === 'general') renderSettings(panel); else renderAbout(panel);
  }

  root.replaceChildren(
    h('header', { class: 'page-head' }, h('div', null,
      h('h1', null, 'Información institucional'),
      h('p', { class: 'page-head__desc' }, 'Textos, datos de contacto e imágenes que se muestran en todo el sitio.'))),
    tablist, panel,
  );
  select('general');
}

async function renderSettings(panel: HTMLElement) {
  panel.replaceChildren(loading());
  const { data, error } = await sb.from('site_settings').select('data').eq('id', 1).maybeSingle();
  if (error) { panel.replaceChildren(errorState(friendlyError(error), () => renderSettings(panel))); return; }
  const settings: Row = data?.data ?? {};

  const groups = SETTINGS_FIELDS.map((g) => ({ ...g, controls: g.fields.map((f) => buildField(f, getPath(settings, f.key))) }));
  const controls = groups.flatMap((g) => g.controls);
  const formError = h('p', { class: 'field-error', role: 'alert' });
  const save = h('button', { type: 'submit', class: 'abtn abtn--primary' }, icon('check'), 'Guardar cambios');

  const form = h('form', { class: 'form', novalidate: true },
    groups.map((g) => h('fieldset', { class: 'fieldset' }, h('legend', null, g.title), h('div', { class: 'form__grid' }, g.controls.map((c) => c.el)))),
    formError,
    h('div', { class: 'form__actions form__actions--sticky' }, save));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    if (!validateAll(controls)) { formError.textContent = 'Revisa los campos marcados.'; return; }
    const next: Row = structuredClone(settings);
    controls.forEach((c) => setPath(next, c.field.key, c.get()));
    save.disabled = true;
    const { error } = await sb.from('site_settings').upsert({ id: 1, data: next, updated_at: new Date().toISOString() });
    save.disabled = false;
    if (error) { formError.textContent = friendlyError(error); toast(friendlyError(error), 'error'); return; }
    cleanupMedia(controls.flatMap((c) => [...c.replaced(), ...c.uploaded()]));
    Object.assign(settings, next);
    toast('Información guardada. El sitio se actualizará en menos de un minuto.');
  });
  panel.replaceChildren(form);
}

async function renderAbout(panel: HTMLElement) {
  panel.replaceChildren(loading());
  const { data, error } = await sb.from('about_sections').select('*').order('position');
  if (error) { panel.replaceChildren(errorState(friendlyError(error), () => renderAbout(panel))); return; }
  const sections = (data ?? []) as Row[];
  if (!sections.length) {
    panel.replaceChildren(h('div', { class: 'state state--empty' }, h('p', null, 'No hay subsecciones. Ejecuta supabase/003_seed.sql para crear Historia, Misión, Visión, Valores y Liderazgo.')));
    return;
  }

  panel.replaceChildren(
    h('p', { class: 'muted' }, 'Cada subsección se muestra en «Quiénes somos», alternando imagen a la izquierda y a la derecha.'),
    ...sections.map((s) => {
      const controls: FieldControl[] = ABOUT_FIELDS.map((f) => buildField(f, s[f.key]));
      const err = h('p', { class: 'field-error', role: 'alert' });
      const btn = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--sm' }, icon('check', 16), 'Guardar');
      const form = h('form', { class: 'form', novalidate: true },
        h('div', { class: 'form__grid' }, controls.map((c) => c.el)), err, h('div', { class: 'form__actions' }, btn));
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        err.textContent = '';
        if (!validateAll(controls)) return;
        const payload: Row = { updated_at: new Date().toISOString() };
        controls.forEach((c) => { payload[c.field.key] = c.get(); });
        if (Array.isArray(payload.list) && !payload.list.length) payload.list = null;
        btn.disabled = true;
        const { error } = await sb.from('about_sections').update(payload).eq('id', s.id);
        btn.disabled = false;
        if (error) { err.textContent = friendlyError(error); return; }
        cleanupMedia(controls.flatMap((c) => [...c.replaced(), ...c.uploaded()]));
        toast(`«${payload.eyebrow}» guardado.`);
      });
      return h('details', { class: 'section-card' },
        h('summary', null, h('span', { class: 'section-card__eyebrow' }, s.eyebrow), h('span', null, s.title)),
        form);
    }),
  );
}
