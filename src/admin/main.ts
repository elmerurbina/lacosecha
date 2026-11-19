/**
 * Punto de entrada del panel administrativo (RF-22..RF-37).
 * SPA con rutas por hash (#/eventos, #/eventos/nuevo, #/eventos/<id>) para que funcione
 * igual en admin.comunidadlacosecha.com y en /admin sin configuración extra.
 */
import { sb, configured, friendlyError } from './sb';
import { h, icon, toast, errorState } from './dom';
import { RESOURCES } from './resources';
import { renderCrud } from './views/crud';
import { renderLogin } from './views/login';
import { renderDashboard } from './views/dashboard';
import { renderMetrics } from './views/metrics';
import { renderContent } from './views/content';
import { renderPrayers } from './views/prayers';

type View = (root: HTMLElement, params: string[]) => void | Promise<void>;

interface NavItem { path: string; label: string; icon: string; view: View; group?: string }

const NAV: NavItem[] = [
  { path: '', label: 'Inicio', icon: 'dashboard', view: renderDashboard },
  { path: 'metricas', label: 'Métricas', icon: 'chart', view: renderMetrics },
  { path: 'contenido', label: 'Información institucional', icon: 'building', view: renderContent, group: 'Contenido' },
  ...RESOURCES.map((r) => ({
    path: r.path, label: r.title, icon: r.icon, group: 'Contenido',
    view: (root: HTMLElement, params: string[]) => renderCrud(root, r, params),
  })),
  { path: 'oracion', label: 'Peticiones de oración', icon: 'heart', view: renderPrayers, group: 'Comunidad' },
];

const app = document.getElementById('app')!;
let userEmail = '';

function parseHash(): string[] {
  return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

/* ---------- Estructura (sidebar + contenido) ---------- */
function shell(): { main: HTMLElement } {
  const groups = new Map<string, NavItem[]>();
  NAV.forEach((n) => { const g = n.group ?? ''; groups.set(g, [...(groups.get(g) ?? []), n]); });

  const closeMenu = () => document.body.classList.remove('menu-open');
  const nav = h('nav', { class: 'side__nav', 'aria-label': 'Secciones del panel' },
    [...groups.entries()].map(([g, items]) => h('div', { class: 'side__group' },
      g ? h('p', { class: 'side__label' }, g) : null,
      h('ul', null, items.map((n) => h('li', null,
        h('a', { href: `#/${n.path}`, dataset: { path: n.path }, onclick: closeMenu }, icon(n.icon), h('span', null, n.label)),
      ))),
    )),
  );

  const main = h('main', { class: 'content', id: 'content', tabindex: '-1' });
  const layout = h('div', { class: 'layout' },
    h('aside', { class: 'side', id: 'side' },
      h('div', { class: 'side__brand' },
        h('span', { class: 'side__mark', 'aria-hidden': 'true' }, 'LC'),
        h('span', null, h('strong', null, 'La Cosecha'), h('small', null, 'Panel administrativo')),
      ),
      nav,
      h('div', { class: 'side__foot' },
        h('a', { href: 'https://comunidadlacosecha.com', target: '_blank', rel: 'noopener', class: 'side__link' }, icon('external', 16), 'Ver sitio público'),
        h('p', { class: 'side__user', title: userEmail }, userEmail),
        h('button', { type: 'button', class: 'abtn abtn--ghost abtn--block', onclick: logout }, icon('logout', 16), 'Cerrar sesión'),
      ),
    ),
    h('div', { class: 'scrim', onclick: closeMenu }),
    h('div', { class: 'main' },
      h('header', { class: 'topbar' },
        h('button', { type: 'button', class: 'topbar__menu', 'aria-label': 'Abrir menú', 'aria-controls': 'side',
          onclick: () => document.body.classList.toggle('menu-open') }, icon('menu', 22)),
        h('span', { class: 'topbar__title' }, 'La Cosecha · Admin'),
      ),
      main,
    ),
  );
  app.replaceChildren(layout);
  return { main };
}

let mainEl: HTMLElement | null = null;

async function route() {
  if (!mainEl) return;
  const [first = '', ...rest] = parseHash();
  const item = NAV.find((n) => n.path === first) ?? NAV[0];
  document.querySelectorAll<HTMLAnchorElement>('.side__nav a').forEach((a) => {
    if (a.dataset.path === item.path) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  document.title = `${item.label} | Admin La Cosecha`;
  mainEl.replaceChildren();
  mainEl.scrollTop = 0;
  window.scrollTo(0, 0);
  try {
    await item.view(mainEl, rest);
  } catch (err) {
    mainEl.replaceChildren(errorState(friendlyError(err), route));
  }
  mainEl.focus({ preventScroll: true });
}

async function logout() {
  await sb.auth.signOut();
  toast('Sesión cerrada.');
}

/** Verifica que el usuario autenticado esté registrado como administrador (RF-24). */
async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await sb.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

async function start() {
  if (!configured) {
    app.replaceChildren(h('div', { class: 'auth' }, h('div', { class: 'auth__card' },
      h('h1', null, 'Panel no configurado'),
      h('p', null, 'Faltan las variables SUPABASE_URL y SUPABASE_ANON_KEY en el entorno del despliegue.'),
    )));
    return;
  }

  let current: string | null | undefined; // undefined = aún no se conoce el estado inicial
  sb.auth.onAuthStateChange((_event, session) => {
    const id = session?.user.id ?? null;
    if (id === current) return;
    current = id;
    // Diferir: no llamar a Supabase dentro del callback (recomendación de supabase-js).
    setTimeout(() => onSession(session?.user ?? null), 0);
  });
}

async function onSession(user: { id: string; email?: string } | null) {
  if (!user) {
    mainEl = null;
    renderLogin(app);
    return;
  }
  try {
    if (!(await isAdmin(user.id))) {
      await sb.auth.signOut();
      toast('Tu cuenta no tiene permisos de administrador.', 'error');
      return;
    }
  } catch (err) {
    app.replaceChildren(h('div', { class: 'auth' }, errorState(friendlyError(err), () => onSession(user))));
    return;
  }
  userEmail = user.email ?? '';
  mainEl = shell().main;
  route();
}

window.addEventListener('hashchange', route);
start();
