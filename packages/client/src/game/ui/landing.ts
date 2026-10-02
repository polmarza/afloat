// Landing page shown before the setup wizard: a hero over the live 3D ship,
// then how to play, the crew, items, rooms and events. Every rules text comes
// from the game content and BALANCE, so the page follows any change to them.

import { BALANCE } from '@afloat/shared/config/balance';
import { CHARACTERS } from '@afloat/shared/content/characters';
import { EVENT_DECK, EVENT_DESCRIPTIONS, EVENT_NAMES } from '@afloat/shared/content/events';
import { ITEM_DECK, ITEMS } from '@afloat/shared/content/items';
import { ROLE_ORDER, ROLES } from '@afloat/shared/content/roles';
import { FLOODED_GUIDE, ROOM_BLURBS, ROOM_GUIDE, ROOM_NAMES, type RoomType } from '@afloat/shared/content/rooms';
import type { ItemImages, Portraits } from '../portraits';
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

const o = BALANCE.oxygen;
const STEPS = [
  {
    title: 'Despertáis a oscuras',
    text: 'Solo los camarotes tienen luz. Cada puerta que abrís descubre una sala nueva, y el submarino es distinto en cada partida.',
  },
  {
    title: `${BALANCE.actionsPerTurn} acciones por turno`,
    text: `Moverse, abrir puertas, buscar, reparar, curar, dar y usar objetos. Lo difícil se decide con 1d${BALANCE.dice.sides} más las bonificaciones de tu rol y tus objetos; un ${BALANCE.dice.autoFailOn} siempre falla.`,
  },
  {
    title: 'El oxígeno es de todos',
    text: `Empezáis con ${o.initial}. Cada ronda se escapan ${o.baseConsumption} por el casco dañado y cada tripulante respira ${o.perCrewMember}. Si alguien cae, el resto aguanta más.`,
  },
  {
    title: 'El casco cede',
    text: `Su integridad empieza en ${BALANCE.hull.initial} y baja ${BALANCE.hull.perRound} cada ronda por la presión, más con cada crisis. Si llega a 0, se acabó.`,
  },
  {
    title: 'Crisis, turnos y consecuencias',
    text: `Cada ronda tiene tres fases. Desde la ronda ${BALANCE.firstEventRound}, empieza robando una carta de evento: agua, fuego, cortocircuitos…`,
  },
  {
    title: 'Dos salidas',
    text: `Reparad la cápsula de escape (${BALANCE.escapePod.seats} plaza) o la energía y las bombas para emerger desde la sala de control con todos. Basta con que uno salga a flote para ganar.`,
  },
];

const ROOM_GROUPS: { title: string; rooms: RoomType[] }[] = [
  { title: 'Sistemas que reparar', rooms: ['engine', 'life_support', 'pumps', 'escape_pod'] },
  { title: 'Salas especiales', rooms: ['bridge', 'greenhouse', 'lab', 'cantina'] },
  { title: 'El resto del submarino', rooms: ['quarters', 'infirmary', 'storage', 'torpedo', 'corridor'] },
];

let heroObserver: IntersectionObserver | null = null;

export interface LandingHandlers {
  onPlay: () => void;
  /** The hero (and the 3D scene behind it) scrolled in or out of view. */
  onHeroVisible: (visible: boolean) => void;
}

export function showLanding(root: HTMLElement, portraits: Portraits, itemImages: ItemImages, handlers: LandingHandlers) {
  root.innerHTML = `
    <nav class="landing-nav">
      <button class="landing-logo" data-goto="top">AFLOAT</button>
      <div class="landing-links">${SECTIONS.map((s) => `<button data-goto="${s.id}">${s.name}</button>`).join('')}</div>
      <button class="primary" data-play>Jugar</button>
    </nav>

    <header class="landing-hero" id="top">
      <div class="landing-hero-text">
        <h1>AFLOAT</h1>
        <p class="landing-tagline">${TAGLINE}</p>
        <button class="primary landing-cta" data-play>Jugar</button>
        <p class="landing-meta">Cooperativo por turnos · 2 a 5 jugadores · en el navegador</p>
      </div>
      <button class="landing-down" data-goto="${SECTIONS[0].id}" aria-label="Cómo se juega">⌄</button>
    </header>

    <section id="como-se-juega" class="landing-section">
      <div class="landing-kicker">CÓMO SE JUEGA</div>
      <h2>Que al menos uno salga a flote</h2>
      <ol class="landing-steps">${STEPS.map((s) => `<li><h3>${s.title}</h3><p>${s.text}</p></li>`).join('')}</ol>
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
      ${ROOM_GROUPS.map((g) => `<h3 class="landing-group">${g.title}</h3>
        <div class="landing-grid">${g.rooms.map((type) => {
          const guide = ROOM_GUIDE[type];
          return `<article class="landing-card landing-room">
            <h3>${ROOM_NAMES[type]}</h3>
            <p>${guide?.text ?? ROOM_BLURBS[type] ?? ''}</p>
            ${guide ? `<p class="muted">${guide.tip}</p>` : ''}
          </article>`;
        }).join('')}</div>`).join('')}
      <article class="landing-card landing-room landing-flooded">
        <h3>${FLOODED_GUIDE.title}</h3>
        <p>Las salas de la cubierta inferior pueden inundarse. ${FLOODED_GUIDE.text}</p>
        <p class="muted">${FLOODED_GUIDE.tip}</p>
      </article>
    </section>

    <section id="eventos" class="landing-section">
      <div class="landing-kicker">EVENTOS</div>
      <h2>Las crisis</h2>
      <p class="muted">Cada ronda, a partir de la ${BALANCE.firstEventRound}, empieza con una carta del mazo de eventos.</p>
      <div class="landing-grid">${EVENT_DECK.map(([id, copies]) => {
        const hull = BALANCE.hull.eventDamage[id];
        const oxygen = id === 'scrubber_failure' ? o.scrubberFailureLoss : 0;
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

  root.onclick = (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if ('play' in t.dataset) {
      hideLanding(root);
      handlers.onPlay();
    } else if (t.dataset.goto) {
      root.querySelector(`#${t.dataset.goto}`)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  heroObserver?.disconnect();
  heroObserver = new IntersectionObserver(([entry]) => handlers.onHeroVisible(entry.isIntersecting));
  heroObserver.observe(root.querySelector('.landing-hero')!);

  root.scrollTop = 0;
  root.style.display = 'block';
}

function hideLanding(root: HTMLElement) {
  heroObserver?.disconnect();
  heroObserver = null;
  root.style.display = 'none';
  root.innerHTML = '';
}
