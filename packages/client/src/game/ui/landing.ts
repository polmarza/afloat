// Landing page shown before the setup wizard: a hero with the crew waking up
// in the quarters, then how to play and the rooms as animated 3D slides, and
// the crew, items and events. Every rules text comes from the game content
// and BALANCE, so the page follows any change to them.

import { BALANCE } from '@afloat/shared/config/balance';
import { CHARACTERS } from '@afloat/shared/content/characters';
import { EVENT_DECK, EVENT_DESCRIPTIONS, EVENT_NAMES } from '@afloat/shared/content/events';
import { ITEM_DECK, ITEMS } from '@afloat/shared/content/items';
import { ROLE_ORDER, ROLES } from '@afloat/shared/content/roles';
import type { Materials } from '../materials';
import type { ItemImages, Portraits } from '../portraits';
import { Vignette } from '../vignette';
import { heroScene, ROOM_SLIDES, STEPS, type Slide } from './landingScenes';
import { hearts } from './sheet';

const REPO_URL = 'https://github.com/polmarza/afloat';
const TAGLINE = 'La alarma os despierta en un submarino averiado. Que al menos uno salga a flote.';

const SECTIONS = [
  { id: 'como-se-juega', name: 'Cómo se juega' },
  { id: 'tripulacion', name: 'Tripulación' },
  { id: 'objetos', name: 'Objetos' },
  { id: 'salas', name: 'Salas' },
  { id: 'eventos', name: 'Eventos' },
];

const GITHUB_ICON = `<svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>`;

/** 3D scenes on the page; their WebGL contexts are released when leaving it. */
let vignettes: Vignette[] = [];

export function showLanding(root: HTMLElement, materials: Materials, portraits: Portraits, itemImages: ItemImages, onPlay: () => void) {
  root.innerHTML = `
    <nav class="landing-nav">
      <button class="landing-logo" data-goto="top">AFLOAT</button>
      <div class="landing-links">${SECTIONS.map((s) => `<button data-goto="${s.id}">${s.name}</button>`).join('')}</div>
      <a class="landing-github" href="${REPO_URL}" target="_blank" rel="noopener" aria-label="Código en GitHub">${GITHUB_ICON}<span>GitHub</span></a>
      <button class="primary" data-play>Jugar</button>
    </nav>

    <header class="landing-hero" id="top">
      <div class="landing-hero-text">
        <h1>AFLOAT</h1>
        <p class="landing-tagline">${TAGLINE}</p>
        <button class="primary landing-cta" data-play>Jugar</button>
        <p class="landing-meta">Cooperativo por turnos · 2 a 5 jugadores · en el navegador</p>
      </div>
      <div class="landing-hero-stage vignette" data-stage="hero"></div>
      <button class="landing-down" data-goto="${SECTIONS[0].id}" aria-label="Cómo se juega">⌄</button>
    </header>

    <section id="como-se-juega" class="landing-section">
      <div class="landing-kicker">CÓMO SE JUEGA</div>
      <h2>Que al menos uno salga a flote</h2>
      ${sliderHtml('steps', STEPS)}
    </section>

    <section id="tripulacion" class="landing-section">
      <div class="landing-kicker">TRIPULACIÓN</div>
      <h2>Cinco tripulantes, cinco maneras de salir</h2>
      <div class="landing-crew">${ROLE_ORDER.map((role) => {
        const c = CHARACTERS[role];
        return `<article class="landing-card role-${role}">
          <img src="${portraits[role].full}" alt="${c.name}" />
          <div class="sheet-kicker">${ROLES[role].name.toUpperCase()}</div>
          <h3>${c.name}</h3>
          <div class="muted">${c.title}</div>
          <p>${c.story}</p>
          <ul>${c.abilities.map((a) => `<li>${a}</li>`).join('')}</ul>
          <div class="sheet-lives">${hearts(c.lives, c.lives)} <span class="muted">${c.lives} vidas</span></div>
        </article>`;
      }).join('')}</div>
    </section>

    <section id="objetos" class="landing-section">
      <div class="landing-kicker">OBJETOS</div>
      <h2>Lo que podéis encontrar</h2>
      <p class="muted">Buscar en una sala puede sacar cualquiera de estos objetos. Están repartidos al azar por todo el submarino.</p>
      <div class="landing-grid">${ITEM_DECK.map(([id, copies]) => {
        const item = ITEMS[id];
        return `<article class="landing-card landing-item">
          <img src="${itemImages[id]}" alt="${item.name}" />
          <h3>${item.name}</h3>
          <p class="landing-strong">${item.description}</p>
          <p class="muted">${item.details.join(' ')}</p>
          <div class="landing-tags"><span>${item.consumable ? 'Se gasta' : 'Permanente'}</span><span>×${copies} en el mazo</span></div>
        </article>`;
      }).join('')}</div>
    </section>

    <section id="salas" class="landing-section">
      <div class="landing-kicker">SALAS</div>
      <h2>Un submarino distinto cada vez</h2>
      <p class="muted">Las salas se colocan al azar en cada partida, pero siempre hay una salida alcanzable. En cualquiera puede haber objetos escondidos.</p>
      ${sliderHtml('rooms', ROOM_SLIDES)}
    </section>

    <section id="eventos" class="landing-section">
      <div class="landing-kicker">EVENTOS</div>
      <h2>Las crisis</h2>
      <p class="muted">Cada ronda, a partir de la ${BALANCE.firstEventRound}, empieza con una carta del mazo de eventos.</p>
      <div class="landing-grid">${EVENT_DECK.map(([id, copies]) => {
        const hull = BALANCE.hull.eventDamage[id];
        const oxygen = id === 'scrubber_failure' ? BALANCE.oxygen.scrubberFailureLoss : 0;
        return `<article class="landing-card landing-event event-${id}">
          <h3>${EVENT_NAMES[id]}</h3>
          <p>${EVENT_DESCRIPTIONS[id]}</p>
          <div class="landing-tags">${hull ? `<span>Casco −${hull}</span>` : ''}${oxygen ? `<span>Oxígeno −${oxygen}</span>` : ''}<span>×${copies} en el mazo</span></div>
        </article>`;
      }).join('')}</div>
    </section>

    <footer class="landing-footer">
      <button class="primary landing-cta" data-play>Jugar</button>
      <p class="muted">Proyecto personal. Todo el arte se genera por código. <a href="${REPO_URL}" target="_blank" rel="noopener">Código en GitHub</a> · licencia MIT.</p>
    </footer>`;

  root.style.display = 'block';
  root.scrollTop = 0;

  const hero = new Vignette(root.querySelector('[data-stage="hero"]')!, materials, 0.92);
  void hero.play(heroScene, false);
  vignettes = [hero, slider(root, 'steps', STEPS, materials), slider(root, 'rooms', ROOM_SLIDES, materials)];

  root.onclick = (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if ('play' in t.dataset) {
      hideLanding(root);
      onPlay();
    } else if (t.dataset.goto) {
      root.querySelector(`#${t.dataset.goto}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  };
}

function sliderHtml(id: string, slides: Slide[]) {
  return `<div class="slider" data-slider="${id}">
      <div class="slider-stage vignette"></div>
      <div class="slider-text">
        <div class="slider-count"></div>
        <div class="landing-kicker slider-kicker"></div>
        <h3></h3>
        <p class="slider-body"></p>
        <p class="muted slider-tip"></p>
        <div class="slider-nav">
          <button class="arrow" data-prev aria-label="Anterior">‹</button>
          <div class="dots">${slides.map((s, i) => `<button class="dot" data-slide="${i}" aria-label="${s.title}"></button>`).join('')}</div>
          <button class="arrow" data-next aria-label="Siguiente">›</button>
        </div>
      </div>
    </div>`;
}

/** Wires one slider: its 3D scene on one side, the text and controls on the other. */
function slider(root: HTMLElement, id: string, slides: Slide[], materials: Materials) {
  const el = root.querySelector<HTMLElement>(`[data-slider="${id}"]`)!;
  const vignette = new Vignette(el.querySelector('.slider-stage')!, materials, 0.9);
  let index = 0;
  const show = (i: number) => {
    index = (i + slides.length) % slides.length;
    const s = slides[index];
    el.querySelector('.slider-count')!.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    el.querySelector('.slider-kicker')!.textContent = s.kicker ?? '';
    el.querySelector('h3')!.textContent = s.title;
    el.querySelector('.slider-body')!.textContent = s.text;
    el.querySelector('.slider-tip')!.textContent = s.tip ?? '';
    el.querySelectorAll('.dot').forEach((d, k) => d.classList.toggle('on', k === index));
    void vignette.play(s.scene);
  };
  el.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if ('prev' in t.dataset) show(index - 1);
    else if ('next' in t.dataset) show(index + 1);
    else if (t.dataset.slide) show(Number(t.dataset.slide));
  });
  show(0);
  return vignette;
}

function hideLanding(root: HTMLElement) {
  for (const v of vignettes) v.dispose();
  vignettes = [];
  root.style.display = 'none';
  root.innerHTML = '';
}
