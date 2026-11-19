/**
 * Visor de fotos y videos a pantalla completa (se crea una sola vez por página).
 * Se construye con APIs del DOM (sin innerHTML con datos). Teclado: ← → Esc. Táctil: deslizar.
 */
export type LightboxItem = { url: string; type: 'image' | 'video' };

let dlg: HTMLDialogElement | null = null;
let stage: HTMLElement;
let counter: HTMLElement;
let caption: HTMLElement;
let prevBtn: HTMLButtonElement;
let nextBtn: HTMLButtonElement;
let items: LightboxItem[] = [];
let index = 0;
let title = '';

const SVG = 'http://www.w3.org/2000/svg';
function svgIcon(d: string) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '24'); s.setAttribute('height', '24');
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS(SVG, 'path'); p.setAttribute('d', d); s.appendChild(p);
  return s;
}
function button(cls: string, label: string, d: string, onClick: () => void) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = cls; b.setAttribute('aria-label', label);
  b.appendChild(svgIcon(d));
  b.addEventListener('click', onClick);
  return b;
}

function build() {
  dlg = document.createElement('dialog');
  dlg.className = 'lbx';
  dlg.setAttribute('aria-label', 'Galería');
  stage = document.createElement('div'); stage.className = 'lbx__stage';
  counter = document.createElement('p'); counter.className = 'lbx__counter';
  caption = document.createElement('p'); caption.className = 'lbx__caption';
  const top = document.createElement('div'); top.className = 'lbx__top';
  top.append(caption, counter, button('lbx__close', 'Cerrar', 'M18 6 6 18M6 6l12 12', close));
  prevBtn = button('lbx__nav lbx__nav--prev', 'Anterior', 'm15 18-6-6 6-6', () => go(-1));
  nextBtn = button('lbx__nav lbx__nav--next', 'Siguiente', 'm9 18 6-6-6-6', () => go(1));
  dlg.append(top, stage, prevBtn, nextBtn);

  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });
  dlg.addEventListener('close', () => stage.replaceChildren());
  // Clic en el fondo oscuro cierra.
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target === stage) close(); });
  // Deslizar en pantallas táctiles.
  let x0: number | null = null;
  stage.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  stage.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    x0 = null;
  });
  document.body.appendChild(dlg);
}

function render() {
  const it = items[index];
  let media: HTMLElement;
  if (it.type === 'video') {
    const v = document.createElement('video');
    v.src = it.url; v.controls = true; v.autoplay = true; v.playsInline = true; v.preload = 'metadata';
    media = v;
  } else {
    const img = document.createElement('img');
    img.src = it.url; img.alt = `${title} — foto ${index + 1}`; img.decoding = 'async';
    media = img;
  }
  media.className = 'lbx__media';
  stage.replaceChildren(media);
  counter.textContent = `${index + 1} / ${items.length}`;
  caption.textContent = title;
  const many = items.length > 1;
  prevBtn.hidden = !many; nextBtn.hidden = !many;
}

function go(d: number) {
  if (items.length < 2) return;
  index = (index + d + items.length) % items.length;
  render();
}

function close() { dlg?.close(); }

export function openLightbox(list: LightboxItem[], start = 0, label = '') {
  if (!list.length) return;
  if (!dlg || !dlg.isConnected) build();
  items = list; index = Math.max(0, Math.min(start, list.length - 1)); title = label;
  render();
  dlg!.showModal();
}
