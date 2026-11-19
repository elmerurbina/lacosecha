/** Inicio de sesión (RF-23). Sin registro público: las cuentas se crean en Supabase (RF-24). */
import { sb, friendlyError } from '../sb';
import { h } from '../dom';

const MAX_ATTEMPTS = 5;
const LOCK_MS = 60_000;
let attempts = 0;
let lockedUntil = 0;

export function renderLogin(root: HTMLElement) {
  const error = h('p', { class: 'field-error', role: 'alert', id: 'login-error' });
  const email = h('input', { id: 'login-email', type: 'email', name: 'email', required: true, autocomplete: 'username', maxLength: 120 });
  const password = h('input', { id: 'login-pass', type: 'password', name: 'password', required: true, autocomplete: 'current-password', minLength: 6, maxLength: 128 });
  const submit = h('button', { type: 'submit', class: 'abtn abtn--primary abtn--block' }, 'Iniciar sesión');

  const form = h('form', { class: 'auth__form', novalidate: true, 'aria-describedby': 'login-error' },
    h('div', { class: 'afield' }, h('label', { for: 'login-email' }, 'Correo electrónico'), email),
    h('div', { class: 'afield' }, h('label', { for: 'login-pass' }, 'Contraseña'), password),
    error,
    submit,
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.textContent = '';
    if (Date.now() < lockedUntil) {
      error.textContent = `Demasiados intentos. Espera ${Math.ceil((lockedUntil - Date.now()) / 1000)} segundos.`;
      return;
    }
    if (!email.checkValidity()) { error.textContent = 'Ingresa un correo válido.'; email.focus(); return; }
    if (!password.value) { error.textContent = 'Ingresa tu contraseña.'; password.focus(); return; }

    submit.disabled = true;
    submit.textContent = 'Verificando…';
    const { error: err } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
    submit.disabled = false;
    submit.textContent = 'Iniciar sesión';
    if (err) {
      attempts++;
      if (attempts >= MAX_ATTEMPTS) { lockedUntil = Date.now() + LOCK_MS; attempts = 0; }
      error.textContent = friendlyError(err);
      password.value = '';
      password.focus();
      return;
    }
    attempts = 0;
    // onAuthStateChange se encarga de mostrar el panel.
  });

  root.replaceChildren(
    h('div', { class: 'auth' },
      h('div', { class: 'auth__card' },
        h('div', { class: 'auth__brand' },
          h('span', { class: 'side__mark side__mark--lg', 'aria-hidden': 'true' }, 'LC'),
          h('div', null, h('p', { class: 'auth__eyebrow' }, 'Comunidad Evangélica'), h('h1', null, 'La Cosecha')),
        ),
        h('p', { class: 'auth__lead' }, 'Panel administrativo. Acceso exclusivo para el equipo autorizado.'),
        form,
      ),
    ),
  );
  email.focus();
}
