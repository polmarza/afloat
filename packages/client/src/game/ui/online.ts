// Before an online game: choose how to play, create or join a room, and the
// waiting room (seats, characters, difficulty, computer crew). Once the server
// starts the game, App takes over with the RemoteSession.

import { BALANCE } from '@afloat/shared/config/balance';
import { CHARACTERS } from '@afloat/shared/content/characters';
import { DIFFICULTY_NAMES, DIFFICULTY_ORDER, DIFFICULTY_TEXT } from '@afloat/shared/content/difficulty';
import { ROLE_ORDER, ROLES, type RoleId } from '@afloat/shared/content/roles';
import { cleanName, isRoomCode, MAX_NAME_LENGTH, normalizeRoomCode, ROOM_CODE_LENGTH, type RoomErrorCode, type RoomView } from '@afloat/shared/net/protocol';
import { saveName, savedName } from '../online/identity';
import { createRoom, RemoteSession, type ConnectionStatus } from '../online/remoteSession';
import type { Portraits } from '../portraits';
import { escapeHtml } from './escape';

export interface OnlineHooks {
  portraits: Portraits;
  /** "En este ordenador": the local setup wizard. */
  onLocal: () => void;
  onHome: () => void;
  /** The game started, or we came back to one in progress. */
  onGameStart: (session: RemoteSession) => void;
  /** The host went back to the waiting room after a game. */
  onBackToLobby: () => void;
}

const ERRORS: Record<RoomErrorCode, string> = {
  not_found: 'No existe ninguna sala con ese código.',
  full: `La sala está llena (${BALANCE.crew.max} tripulantes como mucho).`,
  in_progress: 'La partida de esa sala ya ha empezado.',
  bad_request: 'No se ha podido entrar en la sala.',
};

const STATUS: Record<ConnectionStatus, string> = {
  connecting: 'Conectando…',
  open: '',
  reconnecting: 'Se ha perdido la conexión. Reconectando…',
  closed: '',
};

/** The room code in the address, if the page was opened from an invitation link. */
export function codeFromUrl() {
  const code = normalizeRoomCode(new URLSearchParams(location.search).get('sala') ?? '');
  return isRoomCode(code) ? code : null;
}

const setUrlCode = (code: string | null) => history.replaceState(null, '', code ? `?sala=${code}` : location.pathname);

const nameInput = (id: string) =>
  `<label class="name-label">Tu nombre <input id="${id}" value="${escapeHtml(savedName())}" maxlength="${MAX_NAME_LENGTH}" autocomplete="nickname" /></label>`;

/** "¿Cómo queréis jugar?". With a code (invitation link), straight to joining that room. */
export function showPlayMenu(root: HTMLElement, hooks: OnlineHooks, code: string | null = null) {
  if (code) return showJoin(root, hooks, code);
  root.style.display = 'flex';
  root.innerHTML = `<div class="setup wizard narrow play-menu">
      <div class="sheet-kicker">JUGAR</div>
      <h2>¿Cómo queréis jugar?</h2>
      <button class="mode" data-mode="local"><b>En este ordenador</b><span>Os pasáis el turno, o juegas solo contra la máquina.</span></button>
      <button class="mode" data-mode="create"><b>Crear sala online</b><span>Cada uno desde su casa. Te damos un código para compartir.</span></button>
      <button class="mode" data-mode="join"><b>Unirse con código</b><span>Si alguien ya ha creado la sala.</span></button>
      <div class="row"><button data-home>Portada</button></div>
    </div>`;
  root.onclick = (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t) return;
    if ('home' in t.dataset) close(root, hooks.onHome);
    else if (t.dataset.mode === 'local') close(root, hooks.onLocal);
    else if (t.dataset.mode === 'create') showCreate(root, hooks);
    else if (t.dataset.mode === 'join') showJoin(root, hooks, null);
  };
}

function close(root: HTMLElement, then: () => void) {
  root.style.display = 'none';
  root.innerHTML = '';
  root.onclick = null;
  then();
}

function showCreate(root: HTMLElement, hooks: OnlineHooks, error = '') {
  root.innerHTML = `<form class="setup wizard narrow">
      <div class="sheet-kicker">SALA ONLINE</div>
      <h2>Crear sala</h2>
      ${nameInput('online-name')}
      <p class="setup-error">${escapeHtml(error)}</p>
      <div class="row"><button type="button" data-back>Atrás</button><button class="primary" type="submit">Crear sala</button></div>
    </form>`;
  focusName(root);
  root.onclick = (e) => (e.target as HTMLElement).closest('[data-back]') && showPlayMenu(root, hooks);
  root.querySelector('form')!.onsubmit = async (e) => {
    e.preventDefault();
    const name = readName(root);
    if (!name) return;
    const button = root.querySelector<HTMLButtonElement>('button[type=submit]')!;
    button.disabled = true;
    button.textContent = 'Creando…';
    try {
      enterRoom(root, hooks, await createRoom(), name);
    } catch {
      showCreate(root, hooks, 'No se ha podido crear la sala. Prueba otra vez en un momento.');
    }
  };
}

function showJoin(root: HTMLElement, hooks: OnlineHooks, code: string | null, error = '') {
  root.style.display = 'flex';
  root.innerHTML = `<form class="setup wizard narrow">
      <div class="sheet-kicker">SALA ONLINE</div>
      <h2>${code ? `Entrar en la sala ${code}` : 'Unirse con código'}</h2>
      ${code ? '' : `<label class="name-label">Código de la sala <input id="online-code" maxlength="${ROOM_CODE_LENGTH + 2}" autocomplete="off" spellcheck="false" class="code-input" /></label>`}
      ${nameInput('online-name')}
      <p class="setup-error">${escapeHtml(error)}</p>
      <div class="row"><button type="button" data-back>${code ? 'Portada' : 'Atrás'}</button><button class="primary" type="submit">Entrar</button></div>
    </form>`;
  root.querySelector<HTMLInputElement>('#online-code')?.focus();
  if (code) focusName(root);
  root.onclick = (e) => {
    if (!(e.target as HTMLElement).closest('[data-back]')) return;
    if (code) {
      setUrlCode(null);
      close(root, hooks.onHome);
    } else showPlayMenu(root, hooks);
  };
  root.querySelector('form')!.onsubmit = (e) => {
    e.preventDefault();
    const typed = code ?? normalizeRoomCode(root.querySelector<HTMLInputElement>('#online-code')!.value);
    if (!isRoomCode(typed)) {
      root.querySelector('.setup-error')!.textContent = `El código tiene ${ROOM_CODE_LENGTH} letras o números.`;
      return;
    }
    const name = readName(root);
    if (name) enterRoom(root, hooks, typed, name);
  };
}

function focusName(root: HTMLElement) {
  const input = root.querySelector<HTMLInputElement>('#online-name')!;
  input.focus();
  input.select();
}

function readName(root: HTMLElement) {
  const name = cleanName(root.querySelector<HTMLInputElement>('#online-name')!.value);
  if (!name) root.querySelector('.setup-error')!.textContent = 'Escribe tu nombre.';
  else saveName(name);
  return name;
}

// ------------------------------------------------------------ waiting room

function enterRoom(root: HTMLElement, hooks: OnlineHooks, code: string, name: string) {
  const session = new RemoteSession(code, name);
  let inGame = false;
  let status: ConnectionStatus = 'connecting';
  root.style.display = 'flex';
  root.innerHTML = `<div class="setup wizard lobby"><div class="sheet-kicker">SALA ${code}</div><h2>Conectando…</h2></div>`;

  const leave = () => {
    session.leave();
    setUrlCode(null);
    close(root, hooks.onHome);
  };
  const startGame = () => {
    if (inGame) return;
    inGame = true;
    root.style.display = 'none';
    hooks.onGameStart(session);
  };

  session.on('status', (s) => {
    status = s;
    const el = root.querySelector('.lobby-status');
    if (el) el.textContent = STATUS[s];
  });
  session.on('error', (codeError) => {
    session.leave();
    if (inGame) return;
    setUrlCode(null);
    showJoin(root, hooks, null, ERRORS[codeError]);
  });
  session.on('room', (room, you) => {
    if (you === null) return;
    setUrlCode(code);
    if (room.phase === 'lobby') {
      if (inGame) {
        inGame = false;
        hooks.onBackToLobby();
      }
      renderLobby(root, hooks.portraits, room, you, STATUS[status]);
    }
  });
  session.on('started', startGame);
  session.on('snapshot', startGame);

  root.onclick = (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || !session.room) return;
    const d = t.dataset;
    if ('leave' in d) leave();
    else if ('copy' in d) void copyLink(t, code);
    else if (d.pick) session.send({ type: 'pick', role: d.pick as RoleId });
    else if (d.level) session.send({ type: 'setDifficulty', difficulty: d.level as RoomView['difficulty'] });
    else if (d.addBot) session.send({ type: 'addBot', role: d.addBot as RoleId });
    else if (d.removeBot) session.send({ type: 'removeBot', seat: Number(d.removeBot) });
    else if ('start' in d) session.send({ type: 'start' });
  };
  root.onchange = (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id !== 'lobby-name') return;
    const clean = cleanName(t.value);
    if (!clean) return;
    saveName(clean);
    session.rename(clean);
  };
  session.connect();
}

async function copyLink(button: HTMLElement, code: string) {
  const link = `${location.origin}${location.pathname}?sala=${code}`;
  try {
    await navigator.clipboard.writeText(link);
    button.textContent = '¡Copiado!';
  } catch {
    button.textContent = link;
  }
  setTimeout(() => (button.textContent = 'Copiar enlace'), 2000);
}

function renderLobby(root: HTMLElement, portraits: Portraits, room: RoomView, you: number, status: string) {
  const me = room.seats[you];
  const host = me.host;
  const hostName = room.seats.find((s) => s.host)?.name ?? '';
  const takenBy = new Map(room.seats.filter((s) => s.role).map((s) => [s.role!, s]));
  const full = room.seats.length >= BALANCE.crew.max;
  const missing = room.seats.length < BALANCE.crew.min ? `Hacen falta al menos ${BALANCE.crew.min} tripulantes.` : room.seats.some((s) => !s.role) ? 'Falta que todos elijan personaje.' : '';

  const seats = room.seats
    .map((s, i) => {
      const photo = s.role ? `<img src="${portraits[s.role].face}" alt="" />` : '<span class="lobby-empty">?</span>';
      const tags = [
        i === you ? '<span class="tag turn-tag">Tú</span>' : '',
        s.host ? '<span class="tag">Anfitrión</span>' : '',
        s.bot ? '<span class="tag bot-tag">Máquina</span>' : '',
        !s.connected ? '<span class="tag bad">Desconectado</span>' : '',
      ].join('');
      const remove = host && s.bot ? `<button class="lobby-remove" data-remove-bot="${i}" aria-label="Quitar">×</button>` : '';
      return `<div class="lobby-seat ${s.role ? `role-${s.role}` : ''}">${photo}<div><b>${escapeHtml(s.name)}</b><div class="muted">${s.role ? ROLES[s.role].name : 'Eligiendo personaje…'}</div><div>${tags}</div></div>${remove}</div>`;
    })
    .join('');

  const roles = ROLE_ORDER.map((role) => {
    const owner = takenBy.get(role);
    const mine = me.role === role;
    const c = CHARACTERS[role];
    return `<button class="lobby-role role-${role} ${mine ? 'selected' : ''}" data-pick="${role}" ${owner && !mine ? 'disabled' : ''} title="${escapeHtml(ROLES[role].ability)}">
        <img src="${portraits[role].face}" alt="" /><b>${c.name}</b><span class="muted">${owner && !mine ? escapeHtml(owner.name) : ROLES[role].name}</span>
      </button>`;
  }).join('');

  const levels = DIFFICULTY_ORDER.map(
    (d) =>
      `<button class="level ${d === room.difficulty ? 'selected' : ''}" data-level="${d}" ${host ? '' : 'disabled'}><b>${DIFFICULTY_NAMES[d]}</b><span>${DIFFICULTY_TEXT[d]}</span><em>Puntos ×${BALANCE.score.multiplier[d]}</em></button>`,
  ).join('');

  const freeRoles = ROLE_ORDER.filter((r) => !takenBy.has(r));
  const bots = host
    ? `<h3>Completar con la máquina</h3><div class="lobby-bots">${freeRoles
        .map((r) => `<button data-add-bot="${r}" ${full ? 'disabled' : ''}>+ ${CHARACTERS[r].name.split(' ')[0]} <span class="muted">${ROLES[r].name}</span></button>`)
        .join('') || '<span class="muted">No quedan personajes libres.</span>'}</div>`
    : '';

  const startRow = host
    ? `<button class="primary" data-start ${missing ? 'disabled' : ''}>Empezar partida</button>`
    : `<span class="muted">Esperando a que ${escapeHtml(hostName)} empiece la partida…</span>`;

  // The name field survives re-renders so typing is never interrupted.
  const focused = document.activeElement?.id === 'lobby-name';
  const typed = root.querySelector<HTMLInputElement>('#lobby-name')?.value;
  root.innerHTML = `<div class="setup wizard lobby">
      <div class="lobby-head">
        <div><div class="sheet-kicker">SALA ONLINE</div><div class="lobby-code">${room.code}</div></div>
        <button data-copy>Copiar enlace</button>
      </div>
      <p class="muted">Pasa el código o el enlace a quienes vayan a jugar. Cada uno elige su personaje.</p>
      <h3>Tripulación <span class="muted">${room.seats.length}/${BALANCE.crew.max}</span></h3>
      <div class="lobby-seats">${seats}</div>
      <p class="lobby-ranked ${room.ranked ? 'on' : ''}">${room.ranked ? 'Esta partida cuenta para el ranking online.' : 'Con tripulantes de la máquina, la partida no cuenta para el ranking.'}</p>
      <h3>Tu personaje</h3>
      <div class="lobby-roles">${roles}</div>
      <label class="name-label lobby-name">Tu nombre <input id="lobby-name" value="${escapeHtml(typed ?? me.name)}" maxlength="${MAX_NAME_LENGTH}" /></label>
      <h3>Dificultad ${host ? '' : '<span class="muted">· la elige quien ha creado la sala</span>'}</h3>
      <div class="levels">${levels}</div>
      ${bots}
      <p class="setup-error">${host ? missing : ''}</p>
      <div class="row"><button data-leave>Salir de la sala</button><span class="lobby-status muted">${status}</span>${startRow}</div>
    </div>`;
  root.style.display = 'flex';
  if (focused) root.querySelector<HTMLInputElement>('#lobby-name')!.focus();
}

/** Leaving the room from inside the game: forget the invitation link. */
export function leaveRoom(session: RemoteSession) {
  session.leave();
  setUrlCode(null);
}
