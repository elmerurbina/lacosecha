/**
 * Peticiones de oración (RF-20, RF-34, RNF-18).
 * Solo administradores pueden leerlas (RLS). Se eliminan solas a los 3 meses (pg_cron).
 */
import { sb, friendlyError } from '../sb';
import { h, icon, toast, confirmDialog, loading, emptyState, errorState, fmtDateTime } from '../dom';
import type { Row } from '../resources';

export async function renderPrayers(root: HTMLElement) {
  const filter = h('select', { 'aria-label': 'Filtrar peticiones' },
    h('option', { value: 'pending' }, 'Pendientes'),
    h('option', { value: 'reviewed' }, 'Revisadas'),
    h('option', { value: '' }, 'Todas'));
  const list = h('div', { class: 'prayer-list' }, loading());
  root.replaceChildren(
    h('header', { class: 'page-head' }, h('div', null,
      h('h1', null, 'Peticiones de oración'),
      h('p', { class: 'page-head__desc' }, 'Información confidencial. Las peticiones se eliminan automáticamente después de 3 meses.'))),
    h('div', { class: 'toolbar' }, filter),
    list,
  );

  const load = async () => {
    list.replaceChildren(loading());
    let q = sb.from('prayer_requests').select('*').order('created_at', { ascending: false }).limit(300);
    if (filter.value === 'pending') q = q.eq('reviewed', false);
    if (filter.value === 'reviewed') q = q.eq('reviewed', true);
    const { data, error } = await q;
    if (error) { list.replaceChildren(errorState(friendlyError(error), load)); return; }
    const rows = (data ?? []) as Row[];
    if (!rows.length) {
      list.replaceChildren(emptyState(filter.value === 'pending' ? 'No hay peticiones pendientes. 🙏' : 'No hay peticiones en esta vista.'));
      return;
    }
    list.replaceChildren(...rows.map((r) => card(r, load)));
  };
  filter.addEventListener('change', load);
  load();
}

function card(r: Row, reload: () => void) {
  const daysLeft = Math.max(0, 90 - Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86_400_000));
  const toggle = h('button', { type: 'button', class: `abtn abtn--sm ${r.reviewed ? 'abtn--ghost' : 'abtn--primary'}`,
    onclick: async () => {
      toggle.disabled = true;
      const { error } = await sb.from('prayer_requests').update({ reviewed: !r.reviewed }).eq('id', r.id);
      if (error) { toggle.disabled = false; return toast(friendlyError(error), 'error'); }
      toast(r.reviewed ? 'Marcada como pendiente.' : 'Marcada como revisada.');
      reload();
    } }, icon('check', 16), r.reviewed ? 'Marcar pendiente' : 'Marcar revisada');

  const contact = r.contact
    ? /@/.test(r.contact)
      ? h('a', { href: `mailto:${encodeURI(r.contact)}` }, r.contact)
      : h('a', { href: `https://wa.me/${String(r.contact).replace(/\D/g, '')}`, target: '_blank', rel: 'noopener' }, r.contact)
    : h('span', { class: 'muted' }, 'Sin contacto');

  return h('article', { class: `prayer ${r.reviewed ? 'is-reviewed' : ''}` },
    h('header', { class: 'prayer__head' },
      h('div', null,
        h('strong', null, r.name || 'Anónimo'),
        r.is_private ? h('span', { class: 'tag' }, 'Confidencial') : h('span', { class: 'tag tag--gold' }, 'Puede compartirse'),
        r.reviewed ? h('span', { class: 'tag tag--ok' }, 'Revisada') : null),
      h('time', { datetime: r.created_at, class: 'muted small' }, fmtDateTime(r.created_at))),
    h('p', { class: 'prayer__body' }, r.request),
    h('footer', { class: 'prayer__foot' },
      h('span', { class: 'small' }, 'Contacto: ', contact),
      h('span', { class: 'muted small' }, `Se elimina en ${daysLeft} días`),
      h('div', { class: 'prayer__actions' },
        toggle,
        h('button', { type: 'button', class: 'icon-btn icon-btn--danger', 'aria-label': 'Eliminar petición',
          onclick: async () => {
            if (!(await confirmDialog('¿Eliminar petición?', 'La petición se eliminará de forma permanente.'))) return;
            const { error } = await sb.from('prayer_requests').delete().eq('id', r.id);
            if (error) return toast(friendlyError(error), 'error');
            toast('Petición eliminada.');
            reload();
          } }, icon('trash')))),
  );
}
