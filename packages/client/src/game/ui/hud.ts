// DOM overlay: top bar, crew panel, action panel, log, toasts, menus and dialogs.

import { BALANCE } from '@afloat/shared/config/balance';
import { DIFFICULTY_NAMES } from '@afloat/shared/content/difficulty';
import { ITEMS } from '@afloat/shared/content/items';
import { ROLES } from '@afloat/shared/content/roles';
import { ROOM_NAMES, SYSTEM_NAMES, type SystemId } from '@afloat/shared/content/rooms';
import { oxygenConsumption, type Action, type GameState, type Player, type Score } from '@afloat/shared/engine';
import type { SeatView } from '@afloat/shared/net/protocol';
import type { ItemImages, Portraits } from '../portraits';
import { escapeHtml } from './escape';
import { isModalOpen } from './modal';
import { actionOptions, activePlayer, type ActionOption } from './options';
import { hearts, showItemSheet, showSheet } from './sheet';

const $ = (id: string) => document.getElementById(id)!;

export type ToastKind = 'info' | 'ok' | 'fail' | 'alert' | 'error';

export interface HudHandlers {
  onAction: (action: Action) => void;
  onLaunch: () => void;
  onTorch: (playerId: string) => void;
  isBusy: () => boolean;
  onMenu: () => void;
}

/** Who plays whom. Local games: every human crew member from this computer. Online: more detail. */
export interface HudSeats {
  controls: (playerId: string) => boolean;
  seat?: (playerId: string) => SeatView | undefined;
  isMe?: (playerId: string) => boolean;
  isHost?: () => boolean;
  /** The host lets the computer play for someone who dropped. */
  onTakeover?: (playerId: string) => void;
}

export class Hud {
  private state: GameState | null = null;
  private logOpen = false;
  /** Crew member shown expanded in the crew row (view only). Follows the turn. */
  private viewedId: string | null = null;
  private lastActiveId: string | null = null;
  private seats: HudSeats = this.localSeats();

  constructor(
    private readonly handlers: HudHandlers,
    private readonly portraits: Portraits,
    private readonly itemImages: ItemImages,
  ) {
    $('actions').onclick = (e) => {
      const takeover = (e.target as HTMLElement).closest<HTMLElement>('[data-takeover]');
      if (takeover) this.seats.onTakeover?.(takeover.dataset.takeover!);
      else this.clickOption(e, this.options);
    };
    $('hud-top').onclick = (e) => (e.target as HTMLElement).closest('#menu-button') && this.handlers.onMenu();
    $('crew-panel').onclick = (e) => {
      const t = e.target as HTMLElement;
      if (!this.state) return;
      const sheet = t.closest<HTMLElement>('[data-sheet]');
      const item = t.closest<HTMLElement>('[data-item]');
      const mini = t.closest<HTMLElement>('[data-view]');
      if (sheet) void showSheet(sheet.dataset.sheet as Player['role'], this.portraits);
      else if (item) void showItemSheet(item.dataset.item as Player['inventory'][number], this.itemImages);
      else if (mini) {
        this.viewedId = mini.dataset.view!;
        this.renderCrew(this.state);
      }
    };
    $('log').onclick = (e) => {
      if (!(e.target as HTMLElement).closest('.log-head')) return;
      this.logOpen = !this.logOpen;
      $('log').classList.toggle('open', this.logOpen);
      $('log').querySelector('.log-head')!.setAttribute('aria-expanded', String(this.logOpen));
      $('log').querySelector('.chevron')!.textContent = this.logOpen ? '▾' : '▴';
      const body = $('log').querySelector('.log-body');
      if (body) body.scrollTop = body.scrollHeight;
    };
    $('menu').onclick = (e) => {
      this.clickOption(e, this.menuOptions);
      this.hideMenu();
    };
    window.addEventListener('keydown', (e) => this.onKey(e));
  }

  private options: ActionOption[] = [];
  private menuOptions: ActionOption[] = [];
  private logSeen = 0;

  private clickOption(e: MouseEvent, list: ActionOption[]) {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-i]');
    if (!btn || btn.disabled) return;
    this.choose(list[Number(btn.dataset.i)]);
  }

  private choose(opt: ActionOption | undefined) {
    if (!opt || opt.disabled) return;
    if (opt.launch) this.handlers.onLaunch();
    else if (opt.action) this.handlers.onAction(opt.action);
  }

  /** 1–9 trigger the action buttons (or the open door menu); L toggles the flashlight; Esc closes the menu. */
  private onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') this.hideMenu();
    if (isModalOpen() || this.handlers.isBusy() || !this.state || this.state.status !== 'playing') return;
    // Not while the setup screen is up (e.g. after abandoning a game).
    if ($('setup').style.display === 'flex') return;
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      const menuOpen = $('menu').style.display === 'block';
      this.choose((menuOpen ? this.menuOptions : this.options)[n - 1]);
      if (menuOpen) this.hideMenu();
    }
    if (e.key === 'l' || e.key === 'L') this.handlers.onTorch(activePlayer(this.state).id);
  }

  private localSeats(): HudSeats {
    return { controls: (id) => !this.state?.players.find((p) => p.id === id)?.bot };
  }

  /** Online: who is who in the room. `null`: a local game. */
  setSeats(seats: HudSeats | null) {
    this.seats = seats ?? this.localSeats();
  }

  /** Tags for the room status of a crew member (online only). `compact`: just the most important one. */
  private seatTags(p: Player, compact = false) {
    const seat = this.seats.seat?.(p.id);
    if (!seat || seat.bot) return '';
    const tags = [
      !seat.connected ? `<span class="tag bad">${compact ? 'Fuera' : 'Desconectado'}</span>` : '',
      seat.takenOver ? '<span class="tag bot-tag">Máquina</span>' : '',
      this.seats.isMe?.(p.id) ? '<span class="tag turn-tag">Tú</span>' : '',
    ].filter(Boolean);
    return compact ? (tags[0] ?? '') : tags.join('');
  }

  render(s: GameState, busy: boolean) {
    this.state = s;
    for (const id of ['hud-top', 'crew-panel', 'actions', 'log']) $(id).style.display = '';
    this.renderTop(s);
    this.renderCrew(s);
    this.renderActions(s, busy);
    this.renderLog(s);
  }

  private renderTop(s: GameState) {
    const p = activePlayer(s);
    const o2 = Math.max(0, s.oxygen);
    const pct = Math.min(100, (o2 / BALANCE.oxygen.initial) * 100);
    const low = pct < 25 ? ' low' : '';
    const hullPct = (s.hull / BALANCE.hull.initial) * 100;
    const hullLow = hullPct <= 30 ? ' low' : '';
    const sys = (Object.keys(s.systems) as SystemId[])
      .map((id) => {
        const sy = s.systems[id];
        const known = s.rooms[sy.roomId].discovered;
        const state = sy.repaired ? 'ok' : known ? `${sy.repairProgress}/${sy.repairRequired}` : '?';
        return `<span class="sys ${sy.repaired ? 'done' : ''}" title="${known ? ROOM_NAMES[s.rooms[sy.roomId].type] : 'Ubicación desconocida'}">${SYSTEM_NAMES[id]} <b>${state}</b></span>`;
      })
      .join('');
    const pod = s.escapePod;
    const podState = pod.launched ? 'lanzada' : !s.rooms[pod.roomId].discovered ? '?' : `${pod.repairProgress}/${pod.repairRequired}`;
    $('hud-top').innerHTML = `
      <div class="turn">RONDA ${s.round} · <b>${escapeHtml(p.name)}</b> <span class="muted">(${ROLES[p.role].name})</span>
        <span class="pips">${'<i class="pip on"></i>'.repeat(s.actionsLeft)}${'<i class="pip"></i>'.repeat(Math.max(0, BALANCE.actionsPerTurn - s.actionsLeft))}</span></div>
      <div class="oxygen${low}"><span>OXÍGENO</span><div class="bar"><div style="width:${pct}%"></div></div><b>${o2}</b><span class="muted">−${oxygenConsumption(s)}/ronda</span></div>
      <div class="oxygen hull${hullLow}" title="Integridad del casco: a 0 cede. Baja ${BALANCE.hull.perRound} por ronda y con fugas, derrumbes e incendios."><span>CASCO</span><div class="bar"><div style="width:${hullPct}%"></div></div><b>${s.hull}</b><span class="muted">/${BALANCE.hull.initial}</span></div>
      <div class="systems">${sys}<span class="sys ${pod.launched ? 'done' : ''}">Cápsula <b>${podState}</b></span></div>
      <button id="menu-button" aria-label="Menú">Menú</button>`;
  }

  /** One row: one crew member expanded (the active one, unless another is being viewed), the rest as portraits. */
  private renderCrew(s: GameState) {
    const active = activePlayer(s);
    if (active.id !== this.lastActiveId) {
      this.lastActiveId = active.id;
      this.viewedId = active.id;
    }
    const viewed = s.players.find((p) => p.id === this.viewedId) ?? active;
    $('crew-panel').innerHTML = s.players
      .map((p) => {
        const status = p.escaped
          ? '<span class="tag ok">A salvo</span>'
          : p.condition === 'dead'
            ? '<span class="tag dead">Muerto</span>'
            : p.condition === 'unconscious'
              ? `<span class="tag bad">Inconsciente · ${BALANCE.health.roundsUnconsciousBeforeDeath - p.roundsUnconscious + 1}</span>`
              : '';
        const out = p.condition !== 'ok' || p.escaped ? 'out' : '';
        const turn = p === active && s.status === 'playing' ? 'turn' : '';
        const photo = `<div class="photo"><img src="${this.portraits[p.role].face}" alt="" /></div>`;
        if (p !== viewed) {
          return `<button class="crew-card mini role-${p.role} ${out} ${turn}" data-view="${p.id}" title="${escapeHtml(p.name)} · ${ROLES[p.role].name}">
            ${photo}<div class="mini-hearts">${hearts(p.health, p.maxHealth)}</div>${p.bot ? '<span class="tag bot-tag">IA</span>' : ''}${this.seatTags(p, true)}${status}
          </button>`;
        }
        const items = p.inventory
          .map((i) => `<button class="item" data-item="${i}" title="${escapeHtml(ITEMS[i].description)}">${ITEMS[i].name}</button>`)
          .join('');
        return `<div class="crew-card active role-${p.role} ${out} ${turn}">
          ${photo}
          <div class="details">
            <div class="name">${escapeHtml(p.name)} <span class="muted">${ROLES[p.role].name}</span>${p.bot ? '<span class="tag bot-tag">Máquina</span>' : ''}${this.seatTags(p)}${turn ? '<span class="tag turn-tag">Su turno</span>' : ''}</div>
            <div>${hearts(p.health, p.maxHealth)} ${status}</div>
            <div class="where">${p.escaped ? 'A salvo' : p.condition === 'dead' ? '' : ROOM_NAMES[s.rooms[p.roomId].type]}</div>
            ${items ? `<div class="items">${items}</div>` : ''}
          </div>
          <button class="info" data-sheet="${p.role}" aria-label="Ficha del personaje">?</button>
        </div>`;
      })
      .join('');
  }

  private renderActions(s: GameState, busy: boolean) {
    const active = activePlayer(s);
    if (s.status === 'playing' && !this.seats.controls(active.id)) {
      this.options = [];
      const name = `<b>${escapeHtml(active.name)}</b>`;
      const seat = this.seats.seat?.(active.id);
      let text = `Turno de ${name}…`;
      if (active.bot) text = `Juega la máquina: ${name}…`;
      else if (seat?.takenOver) text = `Juega la máquina por ${name}…`;
      else if (seat && !seat.connected) {
        const takeover = this.seats.isHost?.() ? ` <button class="special" data-takeover="${active.id}">Que juegue la máquina</button>` : '';
        text = `${name} se ha desconectado. Esperando a que vuelva…${takeover}`;
      }
      $('actions').innerHTML = `<div class="actions-title">ACCIONES</div><div class="bot-turn">${text}</div>`;
      return;
    }
    this.options = s.status === 'playing' ? actionOptions(s) : [];
    $('actions').innerHTML =
      `<div class="actions-title">ACCIONES <span class="muted">· teclas 1–9 · clic en una puerta para abrirla o cruzarla · L: linterna</span></div>` +
      this.options.map((o, i) => optionButton(o, i, busy)).join('');
  }

  /** Collapsed: a bar with the latest line. Open: half the screen, scrollable. */
  private renderLog(s: GameState) {
    const entries = s.log.slice(-120);
    const fresh = s.log.length - this.logSeen;
    this.logSeen = s.log.length;
    const lines = entries
      .map((e, i) => {
        const isNew = i >= entries.length - fresh;
        const cls = e.text.startsWith('ALERTA') ? 'alert' : e.text.startsWith('—') ? 'round' : '';
        return `<div class="${cls} ${isNew ? 'new' : ''}">${escapeHtml(e.text)}</div>`;
      })
      .join('');
    const last = entries.at(-1)?.text ?? '';
    const log = $('log');
    log.classList.toggle('open', this.logOpen);
    log.innerHTML = `<button class="log-head" aria-expanded="${this.logOpen}">
        <span class="log-title">REGISTRO</span><span class="log-last">${escapeHtml(last)}</span><span class="chevron">${this.logOpen ? '▾' : '▴'}</span>
      </button>
      <div class="log-body">${lines}</div>`;
    const body = log.querySelector('.log-body')!;
    body.scrollTop = body.scrollHeight;
  }

  // -------------------------------------------------------------- overlays

  showMenu(x: number, y: number, title: string, options: ActionOption[]) {
    this.menuOptions = options;
    const menu = $('menu');
    menu.innerHTML = `<div class="menu-title">${escapeHtml(title)}</div>` + options.map((o, i) => optionButton(o, i, false)).join('');
    menu.style.display = 'block';
    menu.style.left = `${Math.min(x, window.innerWidth - 280)}px`;
    menu.style.top = `${Math.min(y, window.innerHeight - 40 - options.length * 46)}px`;
  }

  hideMenu() {
    $('menu').style.display = 'none';
  }

  /** Notification at the top right, beside the crew row, for 5 seconds. */
  toast(title: string, opts: { text?: string; kind?: ToastKind; image?: string; ms?: number } = {}) {
    const { text, kind = 'info', image, ms = 5000 } = opts;
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.innerHTML =
      (image ? `<img src="${image}" alt="" />` : '') +
      `<div><div class="toast-title">${escapeHtml(title)}</div>${text ? `<div class="toast-text">${escapeHtml(text)}</div>` : ''}</div>`;
    const box = $('toasts');
    box.appendChild(el);
    while (box.children.length > 4) box.firstElementChild!.remove();
    setTimeout(() => el.classList.add('gone'), ms);
    setTimeout(() => el.remove(), ms + 500);
  }

  tooltip(text: string | null, x = 0, y = 0) {
    const tip = $('tooltip');
    if (!text) {
      tip.style.display = 'none';
      return;
    }
    tip.innerHTML = text;
    tip.style.display = 'block';
    tip.style.left = `${x + 14}px`;
    tip.style.top = `${y + 14}px`;
  }

  /** Lets the active player pick who boards the escape pod. */
  choosePassengers(s: GameState): Promise<string[] | null> {
    const p = activePlayer(s);
    const here = s.players.filter((o) => o.roomId === p.roomId && o.condition === 'ok' && !o.escaped);
    const seats = s.escapePod.seats;
    return new Promise((resolve) => {
      const dialog = $('dialog');
      dialog.innerHTML = `<div class="panel">
        <h2>Cápsula de escape</h2>
        <p>Hay <b>${seats}</b> ${seats === 1 ? 'plaza' : 'plazas'}. Solo pueden subir tripulantes conscientes que estén en esta sala. La cápsula solo se puede lanzar una vez.</p>
        ${here.map((o) => `<label class="check"><input type="${seats === 1 ? 'radio' : 'checkbox'}" name="pod-passenger" value="${o.id}" ${here.length <= seats ? 'checked' : ''}/> ${escapeHtml(o.name)} <span class="muted">${ROLES[o.role].name}</span></label>`).join('')}
        <p class="setup-error" id="pod-error"></p>
        <div class="row"><button id="pod-cancel">Cancelar</button><button id="pod-go" class="primary">Lanzar</button></div>
      </div>`;
      dialog.style.display = 'flex';
      const close = (value: string[] | null) => {
        dialog.style.display = 'none';
        resolve(value);
      };
      $('pod-cancel').onclick = () => close(null);
      $('pod-go').onclick = () => {
        const chosen = [...dialog.querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value);
        if (!chosen.length || chosen.length > seats) {
          $('pod-error').textContent = chosen.length ? `Como mucho ${seats}.` : 'Elige al menos a una persona.';
          return;
        }
        close(chosen);
      };
    });
  }

  /** `onReplay` null: no button (online, only the host starts another game). */
  showEnd(
    s: GameState,
    score: Score,
    rank: number | null,
    onRecords: () => void,
    onReplay: (() => void) | null,
    onNewSetup: () => void,
    labels: { replay: string; setup: string; note: string } = { replay: 'Nueva partida', setup: 'Cambiar jugadores', note: '' },
  ) {
    const saved = s.players.filter((p) => p.escaped);
    const lost = s.players.filter((p) => !p.escaped);
    const reason = [...s.log].reverse().find((e) => e.text.startsWith('VICTORIA') || e.text.startsWith('DERROTA'))?.text ?? '';
    const line = (p: Player) => `<li>${escapeHtml(p.name)} <span class="muted">${ROLES[p.role].name}</span></li>`;
    const points = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
    const dialog = $('dialog');
    dialog.innerHTML = `<div class="panel end ${s.status}">
      <h2>${s.status === 'won' ? 'HABÉIS SALIDO A FLOTE' : 'EL SUBMARINO OS HA ENGULLIDO'}</h2>
      <p>${escapeHtml(reason)}</p>
      <div class="cols">
        <div><h3>A salvo</h3><ul>${saved.map(line).join('') || '<li class="muted">Nadie</li>'}</ul></div>
        <div><h3>Se quedan a bordo</h3><ul>${lost.map(line).join('') || '<li class="muted">Nadie</li>'}</ul></div>
      </div>
      <div class="score">
        <div class="score-total"><span>PUNTUACIÓN</span><b>${score.total}</b>${
          rank ? `<em>${rank === 1 ? '¡Nuevo récord!' : `Puesto ${rank} de los récords`}</em>` : ''
        }</div>
        <table>${score.lines
          .filter((l) => l.points !== 0)
          .map((l) => `<tr><td>${l.label}</td><td class="muted">${l.count}</td><td class="${l.points < 0 ? 'neg' : ''}">${points(l.points)}</td></tr>`)
          .join('')}</table>
        <div class="score-mult"><span>Dificultad ${DIFFICULTY_NAMES[s.difficulty]}</span><span>${score.base} × ${score.multiplier}</span></div>
      </div>
      <p class="muted">Semilla: ${escapeHtml(s.seed)}</p>
      ${labels.note ? `<p class="muted">${labels.note}</p>` : ''}
      <div class="row"><button id="end-records">Récords</button><button id="end-setup">${labels.setup}</button>${onReplay ? `<button id="end-replay" class="primary">${labels.replay}</button>` : ''}</div>
    </div>`;
    dialog.style.display = 'flex';
    $('end-records').onclick = onRecords;
    if (onReplay) {
      $('end-replay').onclick = () => {
        dialog.style.display = 'none';
        onReplay();
      };
    }
    $('end-setup').onclick = () => {
      dialog.style.display = 'none';
      onNewSetup();
    };
  }

  hide() {
    for (const id of ['hud-top', 'crew-panel', 'actions', 'log']) $(id).style.display = 'none';
    this.hideMenu();
  }
}

function optionButton(o: ActionOption, i: number, busy: boolean) {
  const key = i < 9 ? `<kbd>${i + 1}</kbd>` : '';
  const hint = o.hint ? `<small>${escapeHtml(o.hint)}</small>` : '';
  return `<button data-i="${i}" class="${o.special ? 'special' : ''}" ${o.disabled || busy ? 'disabled' : ''}>${key}<span>${escapeHtml(o.label)}</span>${hint}</button>`;
}
