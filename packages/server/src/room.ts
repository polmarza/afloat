// One online room: seats, host, character picks, the game and the computer's
// turns. Pure logic with no Cloudflare APIs: it takes client messages and
// returns what to send to whom, so it can be tested on its own. The Durable
// Object (index.ts) only moves messages and stores `data`.

import { createBotMemory, decide, observe } from '@afloat/shared/ai/bot';
import { BALANCE } from '@afloat/shared/config/balance';
import { CHARACTERS } from '@afloat/shared/content/characters';
import { DIFFICULTY_ORDER, type Difficulty } from '@afloat/shared/content/difficulty';
import { ROLE_ORDER, type RoleId } from '@afloat/shared/content/roles';
import { applyAction, createGame, scoreGame, type Action, type ActionResult, type GameEvent, type GameState, type NewGame } from '@afloat/shared/engine';
import { cleanName, type ClientMessage, type RoomErrorCode, type RoomPhase, type RoomView, type ServerMessage } from '@afloat/shared/net/protocol';

interface Seat {
  /** Secret key of the player's browser; null for computer-controlled crew. */
  key: string | null;
  name: string;
  role: RoleId | null;
  connected: boolean;
  takenOver: boolean;
}

interface Game {
  setup: NewGame;
  state: GameState;
  startEvents: GameEvent[];
  actions: Action[];
  /** Bot memory (rooms searched empty), kept as a list so it can be stored. */
  searchedEmpty: string[];
  /** Every seat was human at the start: the game counts for the online ranking. */
  ranked: boolean;
}

/** A finished ranked game, ready to be written to the ranking. */
export interface RankedGame {
  id: string;
  room: string;
  difficulty: Difficulty;
  status: GameState['status'];
  score: number;
  rounds: number;
  setup: NewGame;
  actions: Action[];
  /** The human players (all of them, connected or not), with their browser keys. */
  players: { key: string; name: string; role: RoleId }[];
}

/** Everything the room needs to survive a restart. Plain JSON. */
export interface RoomData {
  code: string;
  phase: RoomPhase;
  difficulty: Difficulty;
  hostKey: string | null;
  seats: Seat[];
  game: Game | null;
  /** Open connections: connection id → player key. */
  conns: Record<string, string>;
  /** Games started in this room (for ranked game ids). */
  gamesStarted: number;
}

/** A message for one connection. */
export interface Outgoing {
  to: string;
  msg: ServerMessage;
}

export class Room {
  /** Set when a ranked game has just ended; the Durable Object writes it and clears it. */
  finished: RankedGame | null = null;

  constructor(
    readonly data: RoomData,
    /** Seed for each new game (random on the server, fixed in tests). */
    private readonly newSeed: () => string,
  ) {}

  static create(code: string, newSeed: () => string) {
    return new Room({ code, phase: 'lobby', difficulty: 'normal', hostKey: null, seats: [], game: null, conns: {}, gamesStarted: 0 }, newSeed);
  }

  /** Whether the active crew member is played by the server right now. */
  get serverTurn() {
    const g = this.data.game;
    if (this.data.phase !== 'playing' || !g || g.state.status !== 'playing') return false;
    const seat = this.data.seats[g.state.activePlayerIndex];
    return seat.key === null || seat.takenOver;
  }

  get connectionCount() {
    return Object.keys(this.data.conns).length;
  }

  // ------------------------------------------------------------- messages

  receive(conn: string, msg: ClientMessage): Outgoing[] {
    if (msg.type === 'hello') return this.hello(conn, msg.key, msg.name);
    const key = this.data.conns[conn];
    if (key === undefined) return [this.error(conn, 'bad_request')];
    const seat = this.seatIndex(key);
    const host = key === this.data.hostKey;
    const lobby = this.data.phase === 'lobby';
    const d = this.data;

    switch (msg.type) {
      case 'rename': {
        const name = cleanName(msg.name);
        if (!lobby || !name) return [];
        d.seats[seat].name = name;
        return this.roomMessages();
      }
      case 'pick':
        if (!lobby || !ROLE_ORDER.includes(msg.role) || this.roleTaken(msg.role, seat)) return this.roomMessages();
        d.seats[seat].role = msg.role;
        return this.roomMessages();
      case 'setDifficulty':
        if (!lobby || !host || !DIFFICULTY_ORDER.includes(msg.difficulty)) return [];
        d.difficulty = msg.difficulty;
        return this.roomMessages();
      case 'addBot':
        if (!lobby || !host || d.seats.length >= BALANCE.crew.max || !ROLE_ORDER.includes(msg.role) || this.roleTaken(msg.role, -1)) return [];
        d.seats.push({ key: null, name: `${CHARACTERS[msg.role].name.split(' ')[0]} (IA)`, role: msg.role, connected: true, takenOver: false });
        return this.roomMessages();
      case 'removeBot':
        if (!lobby || !host || d.seats[msg.seat]?.key !== null) return [];
        d.seats.splice(msg.seat, 1);
        return this.roomMessages();
      case 'start':
        return host && lobby ? this.start() : [];
      case 'action':
        return this.action(conn, key, msg.action);
      case 'botTakeover': {
        const s = d.seats[msg.seat];
        if (!host || d.phase !== 'playing' || !s || s.key === null || s.connected) return [];
        s.takenOver = true;
        return this.roomMessages();
      }
      case 'rematch':
        if (!host || d.phase !== 'ended') return [];
        d.phase = 'lobby';
        d.game = null;
        // Whoever left during the game frees their seat.
        d.seats = d.seats.filter((s) => s.key === null || s.connected).map((s) => ({ ...s, takenOver: false }));
        this.ensureHost();
        return this.roomMessages();
      case 'resync':
        return d.game ? [{ to: conn, msg: this.snapshot() }] : this.roomMessages();
      case 'leave':
        return this.close(conn);
    }
  }

  /** A connection went away (closed, lost or left). */
  close(conn: string): Outgoing[] {
    const key = this.data.conns[conn];
    if (key === undefined) return [];
    delete this.data.conns[conn];
    // The same player may have the game open in another tab.
    if (Object.values(this.data.conns).includes(key)) return [];
    const i = this.seatIndex(key);
    if (i >= 0) {
      if (this.data.phase === 'lobby') this.data.seats.splice(i, 1);
      else this.data.seats[i].connected = false;
    }
    this.ensureHost();
    return this.roomMessages();
  }

  /** After a restart: forget connections that no longer exist. */
  keepConnections(alive: Set<string>): Outgoing[] {
    const out: Outgoing[] = [];
    for (const conn of Object.keys(this.data.conns)) if (!alive.has(conn)) out.push(...this.close(conn));
    return out;
  }

  /** Plays one action for the computer-controlled crew member whose turn it is. */
  botStep(): { out: Outgoing[]; events: GameEvent[] } {
    const g = this.data.game;
    if (!this.serverTurn || !g) return { out: [], events: [] };
    const memory = { ...createBotMemory(), searchedEmpty: new Set(g.searchedEmpty) };
    let action = decide(g.state, memory);
    let result = applyAction(g.state, action);
    if (result.events[0]?.type === 'ActionRejected') {
      // Should not happen (the bot only picks legal actions), but never get stuck.
      action = { type: 'PASS', playerId: g.state.players[g.state.activePlayerIndex].id };
      result = applyAction(g.state, action);
    }
    return { out: this.commit(action, result), events: result.events };
  }

  // ---------------------------------------------------------------- steps

  private hello(conn: string, key: string, rawName: string): Outgoing[] {
    const d = this.data;
    const name = cleanName(rawName);
    if (!key || !name) return [this.error(conn, 'bad_request')];
    const seat = this.seatIndex(key);
    if (seat >= 0) {
      // Coming back: the seat is theirs again, also if the computer was standing in.
      d.conns[conn] = key;
      d.seats[seat].connected = true;
      d.seats[seat].takenOver = false;
      this.ensureHost();
      const out = this.roomMessages();
      if (d.game) out.push({ to: conn, msg: this.snapshot() });
      return out;
    }
    if (d.phase !== 'lobby') return [this.error(conn, 'in_progress')];
    if (d.seats.length >= BALANCE.crew.max) return [this.error(conn, 'full')];
    d.conns[conn] = key;
    d.seats.push({ key, name, role: null, connected: true, takenOver: false });
    this.ensureHost();
    return this.roomMessages();
  }

  private start(): Outgoing[] {
    const d = this.data;
    if (d.seats.length < BALANCE.crew.min || d.seats.some((s) => !s.role)) return [];
    const setup: NewGame = {
      seed: this.newSeed(),
      difficulty: d.difficulty,
      players: d.seats.map((s) => ({ name: s.name, role: s.role!, bot: s.key === null })),
    };
    const { state, events } = createGame(setup);
    d.gamesStarted = (d.gamesStarted ?? 0) + 1;
    d.game = { setup, state, startEvents: events, actions: [], searchedEmpty: [], ranked: d.seats.every((s) => s.key !== null) };
    d.phase = 'playing';
    const started: ServerMessage = { type: 'started', setup, state, startEvents: events, seq: 0 };
    return [...this.toAll(started), ...this.roomMessages()];
  }

  private action(conn: string, key: string, action: Action): Outgoing[] {
    const g = this.data.game;
    if (this.data.phase !== 'playing' || !g || g.state.status !== 'playing') return [];
    const active = g.state.activePlayerIndex;
    const activeId = g.state.players[active].id;
    const mine = this.seatIndex(key) === active && !this.data.seats[active].takenOver;
    // Calling it a day after an escape: the player in turn decides, or the host for the computer.
    const endGame = action.type === 'END_GAME' && (mine || key === this.data.hostKey);
    if (!(mine && action.playerId === activeId) && !endGame) return [{ to: conn, msg: { type: 'rejected', reason: 'No es tu turno.' } }];
    const accepted = endGame ? { ...action, playerId: activeId } : action;
    const result = applyAction(g.state, accepted);
    const rejected = result.events.find((e) => e.type === 'ActionRejected');
    if (rejected?.type === 'ActionRejected') return [{ to: conn, msg: { type: 'rejected', reason: rejected.reason } }];
    return this.commit(accepted, result);
  }

  /** Stores an accepted action and tells everyone. */
  private commit(action: Action, result: ActionResult): Outgoing[] {
    const g = this.data.game!;
    const memory = { ...createBotMemory(), searchedEmpty: new Set(g.searchedEmpty) };
    observe(memory, g.state, result.events);
    g.searchedEmpty = [...memory.searchedEmpty];
    g.state = result.state;
    g.actions.push(action);
    const out = this.toAll({ type: 'result', seq: g.actions.length, action, events: result.events, state: result.state });
    if (result.state.status !== 'playing') {
      this.data.phase = 'ended';
      out.push(...this.roomMessages());
      if (g.ranked) this.finished = this.rankedGame(g);
      else out.push(...this.toAll({ type: 'ranked', counted: false, reason: 'bots' }));
    }
    return out;
  }

  private rankedGame(g: Game): RankedGame {
    const d = this.data;
    return {
      id: `${d.code}-${d.gamesStarted}`,
      room: d.code,
      difficulty: g.setup.difficulty ?? 'normal',
      status: g.state.status,
      score: scoreGame(g.state).total,
      rounds: g.state.round,
      setup: g.setup,
      actions: g.actions,
      players: d.seats.flatMap((s) => (s.key ? [{ key: s.key, name: s.name, role: s.role! }] : [])),
    };
  }

  /** Player keys of the open connections (to tell each player their own places). */
  connectionKeys() {
    return Object.entries(this.data.conns);
  }

  // -------------------------------------------------------------- helpers

  private seatIndex(key: string) {
    return this.data.seats.findIndex((s) => s.key === key);
  }

  private roleTaken(role: RoleId, except: number) {
    return this.data.seats.some((s, i) => i !== except && s.role === role);
  }

  /** The host is a connected player: the current one if still here, otherwise the first in the list. */
  private ensureHost() {
    const d = this.data;
    const here = (key: string | null) => d.seats.some((s) => s.key !== null && s.key === key && s.connected);
    if (here(d.hostKey)) return;
    d.hostKey = d.seats.find((s) => s.key !== null && s.connected)?.key ?? null;
  }

  view(): RoomView {
    const d = this.data;
    return {
      code: d.code,
      phase: d.phase,
      difficulty: d.difficulty,
      ranked: d.phase === 'lobby' ? d.seats.every((s) => s.key !== null) : !!d.game?.ranked,
      seats: d.seats.map((s) => ({
        name: s.name,
        role: s.role,
        bot: s.key === null,
        connected: s.connected,
        host: s.key !== null && s.key === d.hostKey,
        takenOver: s.takenOver,
      })),
    };
  }

  private snapshot(): ServerMessage {
    const g = this.data.game!;
    return { type: 'snapshot', setup: g.setup, state: g.state, actions: g.actions, seq: g.actions.length };
  }

  /** The room as each connection sees it (with its own seat). */
  private roomMessages(): Outgoing[] {
    const room = this.view();
    return Object.entries(this.data.conns).map(([to, key]) => {
      const you = this.seatIndex(key);
      return { to, msg: { type: 'room', room, you: you >= 0 ? you : null } };
    });
  }

  private toAll(msg: ServerMessage): Outgoing[] {
    return Object.keys(this.data.conns).map((to) => ({ to, msg }));
  }

  private error(to: string, code: RoomErrorCode): Outgoing {
    return { to, msg: { type: 'error', code } };
  }
}
