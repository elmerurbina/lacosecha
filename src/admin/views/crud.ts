/**
 * Vista genérica de listado + formulario para cualquier `Resource`.
 * Rutas: #/<path>  ·  #/<path>/nuevo  ·  #/<path>/<id>
 */
import { sb, friendlyError } from '../sb';
import { h, icon, toast, confirmDialog, loading, emptyState, errorState, slugify } from '../dom';
import { buildField, validateAll, cleanupMedia, geoValue, type FieldControl } from '../fields';
import { removeMedia } from '../upload';
import type { Resource, Row } from '../resources';

export async function renderCrud(root: HTMLElement, r: Resource, params: string[]) {
  const [sub] = params;
  if (sub === 'nuevo') return renderForm(root, r, null);
  if (sub) return renderForm(root, r, sub);
  return renderList(root, r);
}

function header(title: string, desc?: string, actions?: Node) {
  return h('header', { class: 'page-head' },
    h('div', null, h('h1', null, title), desc ? h('p', { class: 'page-head__desc' }, desc) : null),
    actions ?? null);
}

/* ---------------- Listado ---------------- */
async function renderList(root: HTMLElement, r: Resource) {
  const newBtn = h('a', { class: 'abtn abtn--primary', href: `#/${r.path}/nuevo` }, icon('plus'), `Nuevo ${r.singular}`);
  const body = h('div', null, loading());
  root.replaceChildren(header(r.title, r.description, newBtn), body);

  let query = sb.from(r.table).select('*');
  for (const o of r.order) query = query.order(o.column, { ascending: o.ascending, nullsFirst: false });
  const { data, error } = await query.limit(500);
  if (error) { body.replaceChildren(errorState(friendlyError(error), () => renderList(root, r))); return; }
  let rows = (data ?? []) as Row[];

  if (!rows.length) {
    body.replaceChildren(emptyState(`Aún no hay ${r.title.toLowerCase()} registrados.`,
      h('a', { class: 'abtn abtn--primary', href: `#/${r.path}/nuevo` }, icon('plus'), `Agregar el primero`)));
    return;
  }

  const search = h('input', { type: 'search', placeholder: 'Buscar…', 'aria-label': `Buscar en ${r.title}` });
  const filter = r.hasPublish
    ? h('select', { 'aria-label': 'Filtrar por estado' },
        h('option', { value: '' }, 'Todos'), h('option', { value: 'pub' }, 'Publicados'), h('option', { value: 'draft' }, 'Ocultos'))
    : null;
  const count = h('p', { class: 'muted small', role: 'status' });
  const tbody = h('tbody');

  const draw = () => {
    const q = search.value.trim().toLowerCase();
    const f = filter?.value ?? '';
    const visible = rows.filter((row) =>
      (!q || r.search.some((k) => String(row[k] ?? '').toLowerCase().includes(q))) &&
      (!f || (f === 'pub' ? row.published : !row.published)));
    count.textContent = `${visible.length} de ${rows.length}`;
    tbody.replaceChildren(...(visible.length ? visible.map(rowEl) : [h('tr', null, h('td', { colSpan: r.columns.length + 2, class: 'muted center' }, 'Sin resultados.'))]));
  };

  const rowEl = (row: Row) => {
    const pubBtn = r.hasPublish
      ? h('button', {
          type: 'button', class: `pill ${row.published ? 'pill--on' : ''}`,
          'aria-pressed': String(Boolean(row.published)),
          title: row.published ? 'Ocultar del sitio' : 'Publicar en el sitio',
          onclick: async () => {
            pubBtn!.disabled = true;
            const next = !row.published;
            const { error } = await sb.from(r.table).update({ published: next }).eq('id', row.id);
            pubBtn!.disabled = false;
            if (error) return toast(friendlyError(error), 'error');
            row.published = next;
            toast(next ? 'Publicado.' : 'Ocultado del sitio.');
            draw();
          },
        }, icon(row.published ? 'eye' : 'eye-off', 15), row.published ? 'Publicado' : 'Oculto')
      : null;

    return h('tr', null,
      r.columns.map((c, i) => h('td', { dataset: { label: c.label } },
        i === r.columns.findIndex((col) => col.label)
          ? h('a', { href: `#/${r.path}/${encodeURIComponent(row.id)}`, class: 'row-link' }, c.render ? c.render(row) : String(row[c.key] ?? '—'))
          : c.render ? c.render(row) : String(row[c.key] ?? '—'))),
      r.hasPublish ? h('td', { dataset: { label: 'Estado' } }, pubBtn) : null,
      h('td', { class: 'actions' },
        h('a', { class: 'icon-btn', href: `#/${r.path}/${encodeURIComponent(row.id)}`, 'aria-label': `Editar ${row.title ?? row.name ?? row.host ?? ''}` }, icon('edit')),
        h('button', { type: 'button', class: 'icon-btn icon-btn--danger', 'aria-label': `Eliminar ${row.title ?? row.name ?? row.host ?? ''}`,
          onclick: async () => {
            if (await deleteRow(r, row)) { rows = rows.filter((x) => x !== row); draw(); }
          } }, icon('trash')),
      ),
    );
  };

  search.addEventListener('input', draw);
  filter?.addEventListener('change', draw);

  body.replaceChildren(
    h('div', { class: 'toolbar' }, h('div', { class: 'search' }, icon('search', 16), search), filter, count),
    h('div', { class: 'table-wrap' },
      h('table', { class: 'table' },
        h('thead', null, h('tr', null,
          r.columns.map((c) => h('th', { scope: 'col' }, c.label || h('span', { class: 'sr-only' }, 'Imagen'))),
          r.hasPublish ? h('th', { scope: 'col' }, 'Estado') : null,
          h('th', { scope: 'col' }, h('span', { class: 'sr-only' }, 'Acciones')))),
        tbody)),
  );
  draw();
}

async function deleteRow(r: Resource, row: Row): Promise<boolean> {
  const name = row.title ?? row.name ?? row.host ?? r.singular;
  const ok = await confirmDialog(`¿Eliminar ${r.singular}?`, `Se eliminará «${name}» de forma permanente. Esta acción no se puede deshacer.`);
  if (!ok) return false;
  const { error } = await sb.from(r.table).delete().eq('id', row.id);
  if (error) { toast(friendlyError(error), 'error'); return false; }
  // Borrar archivos propios asociados
  r.fields.filter((f) => f.type === 'image' || f.type === 'video').forEach((f) => removeMedia(row[f.key]));
  toast(`${capitalize(r.singular)} eliminado.`);
  return true;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------- Formulario ---------------- */
async function renderForm(root: HTMLElement, r: Resource, id: string | null) {
  const back = h('a', { class: 'back-link', href: `#/${r.path}` }, icon('back', 16), r.title);
  root.replaceChildren(back, loading());

  let row: Row = { ...r.defaults };
  if (r.fields.some((f) => f.type === 'date') && !id) {
    const dateField = r.fields.find((f) => f.type === 'date')!;
    row[dateField.key] ??= new Date().toLocaleDateString('en-CA');
  }
  if (id) {
    const { data, error } = await sb.from(r.table).select('*').eq('id', id).maybeSingle();
    if (error) { root.replaceChildren(back, errorState(friendlyError(error), () => renderForm(root, r, id))); return; }
    if (!data) { root.replaceChildren(back, emptyState('Este registro no existe o fue eliminado.')); return; }
    row = data as Row;
  }

  const controls: FieldControl[] = r.fields.map((f) => buildField(f,
    f.type === 'geo' ? geoValue(row[f.latKey!], row[f.lngKey!]) : row[f.key]));
  const formError = h('p', { class: 'field-error', role: 'alert' });
  const saveBtn = h('button', { type: 'submit', class: 'abtn abtn--primary' }, icon('check'), 'Guardar');
  let saved = false;

  const form = h('form', { class: 'form', novalidate: true },
    h('div', { class: 'form__grid' }, controls.map((c) => c.el)),
    formError,
    h('div', { class: 'form__actions' },
      saveBtn,
      h('a', { class: 'abtn abtn--ghost', href: `#/${r.path}` }, 'Cancelar'),
      id ? h('button', { type: 'button', class: 'abtn abtn--danger-ghost', onclick: async () => {
        if (await deleteRow(r, row)) { saved = true; location.hash = `#/${r.path}`; }
      } }, icon('trash', 16), 'Eliminar') : null,
    ),
  );

  // Si se abandona sin guardar, borrar archivos subidos en esta edición.
  const onLeave = () => {
    window.removeEventListener('hashchange', onLeave);
    if (!saved) cleanupMedia(controls.flatMap((c) => c.discarded()));
  };
  window.addEventListener('hashchange', onLeave);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.textContent = '';
    if (!validateAll(controls)) { formError.textContent = 'Revisa los campos marcados.'; return; }
    const payload: Row = {};
    controls.forEach((c) => {
      if (c.field.type === 'geo') {
        const g = c.get() as { lat: number; lng: number } | null;
        payload[c.field.latKey!] = g?.lat ?? null;
        payload[c.field.lngKey!] = g?.lng ?? null;
      } else payload[c.field.key] = c.get();
    });
    const custom = r.validate?.(payload);
    if (custom) { formError.textContent = custom; return; }

    saveBtn.disabled = true;
    saveBtn.lastChild!.textContent = 'Guardando…';
    let result;
    if (id) {
      result = await sb.from(r.table).update(payload).eq('id', id).select('id').single();
    } else {
      if (r.idType === 'slug') payload.id = await uniqueSlug(r, String(payload[r.slugFrom!] ?? ''));
      result = await sb.from(r.table).insert(payload).select('id').single();
    }
    saveBtn.disabled = false;
    saveBtn.lastChild!.textContent = 'Guardar';
    if (result.error) { formError.textContent = friendlyError(result.error); toast(friendlyError(result.error), 'error'); return; }

    saved = true;
    cleanupMedia(controls.flatMap((c) => [...c.replaced(), ...c.uploaded()]));
    toast(id ? 'Cambios guardados. El sitio se actualizará en menos de un minuto.' : `${capitalize(r.singular)} creado.`);
    location.hash = `#/${r.path}`;
  });

  root.replaceChildren(
    back,
    header(id ? `Editar ${r.singular}` : `Nuevo ${r.singular}`, id ? undefined : r.description),
    form,
  );
  controls[0]?.focus();
}

async function uniqueSlug(r: Resource, source: string): Promise<string> {
  const base = slugify(source);
  const { data } = await sb.from(r.table).select('id').like('id', `${base}%`);
  const taken = new Set((data ?? []).map((d: Row) => d.id));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
