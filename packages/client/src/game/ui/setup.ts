// Game setup, as a short wizard:
//   1. how many players,
//   2. each player picks a character from a carousel and (optionally) types a name,
//   3. "all set" summary with seed and tutorial switch.

import { BALANCE } from '@afloat/shared/config/balance';
import { DIFFICULTY_NAMES, DIFFICULTY_ORDER, DIFFICULTY_TEXT, type Difficulty } from '@afloat/shared/content/difficulty';
import { CHARACTERS } from '@afloat/shared/content/characters';
import { ROLE_ORDER, ROLES, type RoleId } from '@afloat/shared/content/roles';
import type { NewGame } from '@afloat/shared/engine';
import type { Portraits } from '../portraits';
import { escapeHtml } from './escape';
import { loadRecords } from '../records';
import { hearts, showRecords } from './sheet';

const SEED_WORDS = ['ABISMO', 'CORAL', 'SONAR', 'LASTRE', 'PERISCOPIO', 'ESCOTILLA', 'TORPEDO', 'FOSA'];

export function randomSeed() {
  return `${SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)]}${Math.floor(Math.random() * 1000)}`;
}

type Step = 'count' | 'pick' | 'name' | 'summary';

/** "Jugador N" for humans; the character's first name for the computer. */
function defaultName(index: number, role: RoleId, bot: boolean) {
  return bot ? `${CHARACTERS[role].name.split(' ')[0]} (IA)` : `Jugador ${index + 1}`;
}

export function showSetup(
  root: HTMLElement,
  portraits: Portraits,
  previous: NewGame | null,
  tutorialDefault: boolean,
  onStart: (game: NewGame, tutorial: boolean) => void,
) {
  // First game ever (no previous setup): tutorial on by default.
  let tutorial = previous ? tutorialDefault : true;
  let seed = randomSeed();
  let count = previous?.players.length ?? 3;
  let difficulty: Difficulty = previous?.difficulty ?? 'normal';
  let step: Step = 'count';
  const picks: { role: RoleId; name: string; bot: boolean }[] = [];
  /** Name-step choice: who controls this crew member. */
  let pendingBot = false;
  /** Name typed in the name step (null = use the default). */
  let pendingName: string | null = null;
  /** Position in the carousel of characters still available. */
  let slide = 0;
  let pendingRole: RoleId = ROLE_ORDER[0];

  const available = () => ROLE_ORDER.filter((r) => !picks.some((p) => p.role === r));
  /** Index of the player choosing now. */
  const current = () => picks.length;

  const render = () => {
    root.style.display = 'flex';
    root.innerHTML = step === 'count' ? countView() : step === 'pick' ? pickView() : step === 'name' ? nameView() : summaryView();
    const input = root.querySelector<HTMLInputElement>('#player-name');
    if (input) {
      input.focus();
      input.select();
    }
  };

  const countView = () => `<div class="setup wizard">
      <h1>AFLOAT</h1>
      <p class="muted">La alarma os despierta en un submarino averiado. Que al menos uno salga a flote.</p>
      <h2>¿Cuántos vais a jugar?</h2>
      <div class="counts">${[2, 3, 4, 5].map((n) => `<button class="count ${n === count ? 'selected' : ''}" data-count="${n}">${n}</button>`).join('')}</div>
      <h2>Dificultad</h2>
      <div class="levels">${DIFFICULTY_ORDER.map((d) => `<button class="level ${d === difficulty ? 'selected' : ''}" data-level="${d}"><b>${DIFFICULTY_NAMES[d]}</b><span>${DIFFICULTY_TEXT[d]}</span><em>Puntos ×${BALANCE.score.multiplier[d]}</em></button>`).join('')}</div>
      <div class="row"><button data-records>Récords</button><button class="primary" data-next>Elegir personajes</button></div>
    </div>`;

  const pickView = () => {
    const roles = available();
    slide = (slide + roles.length) % roles.length;
    const role = roles[slide];
    const c = CHARACTERS[role];
    return `<div class="setup wizard">
      <div class="sheet-kicker">JUGADOR ${current() + 1} DE ${count}</div>
      <h2>Elige tu personaje</h2>
      <div class="carousel">
        <button class="arrow" data-prev aria-label="Anterior" ${roles.length < 2 ? 'disabled' : ''}>‹</button>
        <div class="slide role-${role}">
          <div class="sheet-photo"><img src="${portraits[role].full}" alt="${c.name}" /></div>
          <div class="sheet-body">
            <div class="sheet-kicker">${ROLES[role].name.toUpperCase()}</div>
            <h2>${c.name}</h2>
            <div class="muted">${c.title}</div>
            <p class="sheet-story">${c.story}</p>
            <ul>${c.abilities.map((a) => `<li>${a}</li>`).join('')}</ul>
            <div class="sheet-lives">${hearts(c.lives, c.lives)} <span class="muted">${c.lives} vidas</span></div>
          </div>
        </div>
        <button class="arrow" data-next-slide aria-label="Siguiente" ${roles.length < 2 ? 'disabled' : ''}>›</button>
      </div>
      <div class="dots">${roles.map((r, i) => `<button class="dot ${i === slide ? 'on' : ''}" data-slide="${i}" aria-label="${CHARACTERS[r].name}"></button>`).join('')}</div>
      <div class="row"><button data-back>Atrás</button><button class="primary" data-choose="${role}">Elegir a ${c.name}</button></div>
    </div>`;
  };

  const nameView = () => {
    const c = CHARACTERS[pendingRole];
    return `<div class="setup wizard narrow">
      <div class="sheet-kicker">JUGADOR ${current() + 1} DE ${count}</div>
      <div class="name-step">
        <img src="${portraits[pendingRole].face}" alt="" />
        <div><h2>${c.name}</h2><div class="muted">${ROLES[pendingRole].name}</div></div>
      </div>
      <div class="control-pick">
        <button class="${pendingBot ? '' : 'selected'}" data-control="human">Humano</button>
        <button class="${pendingBot ? 'selected' : ''}" data-control="bot">Máquina</button>
      </div>
      <label class="name-label">${pendingBot ? 'Nombre del tripulante' : '¿Cómo te llamas?'}
        <input id="player-name" value="${escapeHtml(pendingName ?? defaultName(current(), pendingRole, pendingBot))}" maxlength="16" />
      </label>
      <div class="row"><button data-back>Cambiar personaje</button><button class="primary" data-confirm>Confirmar</button></div>
    </div>`;
  };

  const summaryView = () => `<div class="setup wizard">
      <div class="sheet-kicker">TODO LISTO</div>
      <h2>Vuestra tripulación</h2>
      <div class="crew-strip">${picks
        .map(
          (p) => `<div class="strip-card role-${p.role}">
            <img src="${portraits[p.role].face}" alt="" />
            <b>${escapeHtml(p.name)}</b>
            <span>${CHARACTERS[p.role].name}</span>
            <span class="muted">${ROLES[p.role].name}</span>
            ${p.bot ? '<span class="tag bot-tag">Máquina</span>' : ''}
          </div>`,
        )
        .join('')}</div>
      <p class="muted">Dificultad: <b>${DIFFICULTY_NAMES[difficulty]}</b> · puntos ×${BALANCE.score.multiplier[difficulty]}</p>
      <label>Semilla del submarino <input id="setup-seed" value="${escapeHtml(seed)}" maxlength="24" /> <button data-reseed type="button">Otra</button></label>
      <label class="check"><input type="checkbox" id="setup-tutorial" ${tutorial ? 'checked' : ''} /> Jugar como tutorial <span class="muted">· explica el objetivo y cada sala importante la primera vez que entráis</span></label>
      <div class="row"><button data-back>Atrás</button><button class="primary" data-start>Empezar partida</button></div>
    </div>`;

  const confirmName = () => {
    const name = root.querySelector<HTMLInputElement>('#player-name')!.value.trim() || defaultName(current(), pendingRole, pendingBot);
    picks.push({ role: pendingRole, name, bot: pendingBot });
    pendingBot = false;
    pendingName = null;
    slide = 0;
    step = picks.length === count ? 'summary' : 'pick';
    render();
  };

  const start = () => {
    seed = root.querySelector<HTMLInputElement>('#setup-seed')!.value.trim() || randomSeed();
    tutorial = root.querySelector<HTMLInputElement>('#setup-tutorial')!.checked;
    window.removeEventListener('keydown', onKey);
    root.style.display = 'none';
    onStart({ seed, difficulty, players: picks.map((p) => ({ ...p })) }, tutorial);
  };

  const back = () => {
    if (step === 'pick') {
      if (picks.length) {
        // Back to the previous player's name, undoing their pick.
        const last = picks.pop()!;
        pendingRole = last.role;
        pendingBot = last.bot;
        step = 'name';
      } else step = 'count';
    } else if (step === 'name') step = 'pick';
    else if (step === 'summary') {
      const last = picks.pop()!;
      pendingRole = last.role;
      pendingBot = last.bot;
      step = 'name';
    }
    render();
  };

  root.onclick = (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    const d = t.dataset;
    if (d.count) {
      count = Number(d.count);
      render();
    } else if (d.level) {
      difficulty = d.level as Difficulty;
      render();
    } else if ('next' in d) {
      picks.length = 0;
      slide = 0;
      step = 'pick';
      render();
    } else if ('prev' in d) {
      slide--;
      render();
    } else if ('nextSlide' in d) {
      slide++;
      render();
    } else if (d.slide) {
      slide = Number(d.slide);
      render();
    } else if (d.choose) {
      pendingRole = d.choose as RoleId;
      pendingName = null;
      step = 'name';
      render();
    } else if (d.control) {
      // Keep a typed name; swap only the default one.
      if (pendingName === defaultName(current(), pendingRole, pendingBot)) pendingName = null;
      pendingBot = d.control === 'bot';
      render();
    } else if ('confirm' in d) confirmName();
    else if ('back' in d) back();
    else if ('reseed' in d) {
      seed = randomSeed();
      root.querySelector<HTMLInputElement>('#setup-seed')!.value = seed;
    } else if ('start' in d) start();
    else if ('records' in d) void showRecords(loadRecords());
  };
  root.oninput = (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'setup-seed') seed = t.value;
    if (t.id === 'player-name') pendingName = t.value;
    if (t.id === 'setup-tutorial') tutorial = t.checked;
  };

  // ← → move the carousel; Enter goes forward.
  const onKey = (e: KeyboardEvent) => {
    if (root.style.display === 'none') return;
    if (step === 'pick' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      slide += e.key === 'ArrowLeft' ? -1 : 1;
      render();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (step === 'count') root.querySelector<HTMLButtonElement>('[data-next]')?.click();
      else if (step === 'pick') root.querySelector<HTMLButtonElement>('[data-choose]')?.click();
      else if (step === 'name') confirmName();
      else if (step === 'summary' && (e.target as HTMLElement).id !== 'setup-seed') start();
    }
  };
  window.addEventListener('keydown', onKey);
  render();
}
