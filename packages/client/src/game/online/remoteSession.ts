// The online side of Session: a WebSocket to the room's server. Keeps the room
// (seats, host), the game as the server sends it, and reconnects on its own.

import type { Action, ActionResult, GameEvent, GameState, NewGame } from '@afloat/shared/engine';
import type { ClientMessage, RoomErrorCode, RoomView, SeatView, ServerMessage } from '@afloat/shared/net/protocol';
import type { PlayedAction, Session } from '../session';
import { playerKey } from './identity';

export type ConnectionStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

export interface RemoteEvents {
  room: (room: RoomView, you: number | null) => void;
  started: () => void;
  /** The whole game arrived again (after reconnecting): rebuild, don't animate. */
  snapshot: () => void;
  error: (code: RoomErrorCode) => void;
  status: (status: ConnectionStatus) => void;
  /** The game just finished: how it went into the ranking. */
  ranked: (result: RankedMessage) => void;
}

export type RankedMessage = Extract<ServerMessage, { type: 'ranked' }>;

/** Creates a room on the server and returns its code. */
export async function createRoom(): Promise<string> {
  const res = await fetch('/api/rooms', { method: 'POST' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return ((await res.json()) as { code: string }).code;
}

const RECONNECT_MAX_MS = 10_000;
const SUBMIT_TIMEOUT_MS = 15_000;

export class RemoteSession implements Session {
  room: RoomView | null = null;
  you: number | null = null;
  setup!: NewGame;
  state!: GameState;
  startEvents: GameEvent[] = [];
  actions: Action[] = [];
  /** How the last finished game went into the ranking (it may arrive just before or after the end screen). */
  lastRanked: RankedMessage | null = null;

  private ws: WebSocket | null = null;
  private seq = 0;
  private closing = false;
  private retries = 0;
  private readonly listeners: ((played: PlayedAction) => void)[] = [];
  private pending: { action: Action; resolve: (r: ActionResult) => void } | null = null;
  private readonly subscribers = new Map<keyof RemoteEvents, ((...args: never[]) => void)[]>();

  constructor(
    readonly code: string,
    private name: string,
  ) {}

  get isHost() {
    return this.you !== null && !!this.room?.seats[this.you]?.host;
  }

  on<K extends keyof RemoteEvents>(event: K, fn: RemoteEvents[K]) {
    const list = this.subscribers.get(event) ?? [];
    list.push(fn as (...args: never[]) => void);
    this.subscribers.set(event, list);
  }

  private emit<K extends keyof RemoteEvents>(event: K, ...args: Parameters<RemoteEvents[K]>) {
    for (const fn of [...(this.subscribers.get(event) ?? [])]) (fn as unknown as (...a: Parameters<RemoteEvents[K]>) => void)(...args);
  }

  connect() {
    this.closing = false;
    this.emit('status', this.retries ? 'reconnecting' : 'connecting');
    const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/rooms/${this.code}/ws`);
    this.ws = ws;
    ws.onopen = () => {
      this.retries = 0;
      this.emit('status', 'open');
      this.send({ type: 'hello', key: playerKey(), name: this.name });
    };
    ws.onmessage = (e) => this.receive(JSON.parse(e.data as string) as ServerMessage);
    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      this.failPending('Se ha perdido la conexión.');
      if (this.closing) return this.emit('status', 'closed');
      // Try again, waiting a little longer each time.
      this.retries++;
      this.emit('status', 'reconnecting');
      setTimeout(() => !this.closing && this.connect(), Math.min(RECONNECT_MAX_MS, 500 * 2 ** this.retries));
    };
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  rename(name: string) {
    this.name = name;
    this.send({ type: 'rename', name });
  }

  /** Leaves the room for good (no reconnection). */
  leave() {
    this.closing = true;
    this.send({ type: 'leave' });
    this.ws?.close();
    this.ws = null;
  }

  seatOf(playerId: string): SeatView | undefined {
    const i = this.state?.players.findIndex((p) => p.id === playerId) ?? -1;
    return i >= 0 ? this.room?.seats[i] : undefined;
  }

  // -------------------------------------------------------------- Session

  submit(action: Action): Promise<ActionResult> {
    this.failPending('Acción anterior sin respuesta.');
    return new Promise((resolve) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return resolve(this.rejected('Sin conexión con la sala.'));
      this.pending = { action, resolve };
      this.send({ type: 'action', action });
      setTimeout(() => this.pending?.action === action && this.failPending('El servidor no responde.'), SUBMIT_TIMEOUT_MS);
    });
  }

  onResult(listener: (played: PlayedAction) => void) {
    this.listeners.push(listener);
  }

  /** Only your own crew member, and only while the computer isn't standing in for you. */
  controls(playerId: string) {
    const i = this.state?.players.findIndex((p) => p.id === playerId) ?? -1;
    return i >= 0 && i === this.you && this.room?.phase === 'playing' && !this.room.seats[i].takenOver;
  }

  /** Yourself; and the host answers for the computer. */
  answersFor(playerId: string) {
    const seat = this.seatOf(playerId);
    return this.controls(playerId) || (this.isHost && !!seat && (seat.bot || seat.takenOver));
  }

  // ------------------------------------------------------------- incoming

  private receive(msg: ServerMessage) {
    switch (msg.type) {
      case 'room':
        this.room = msg.room;
        this.you = msg.you;
        this.emit('room', msg.room, msg.you);
        break;
      case 'started':
        this.setup = msg.setup;
        this.state = msg.state;
        this.startEvents = msg.startEvents;
        this.actions = [];
        this.seq = msg.seq;
        this.lastRanked = null;
        this.emit('started');
        break;
      case 'snapshot':
        this.setup = msg.setup;
        this.state = msg.state;
        this.startEvents = [];
        this.actions = msg.actions;
        this.seq = msg.seq;
        this.failPending('Se ha recuperado la partida.');
        this.emit('snapshot');
        break;
      case 'result': {
        if (msg.seq !== this.seq + 1) {
          // Missed something: ask for the whole game.
          this.send({ type: 'resync' });
          return;
        }
        this.seq = msg.seq;
        this.actions.push(msg.action);
        this.state = msg.state;
        const played: PlayedAction = { action: msg.action, events: msg.events, state: msg.state };
        // Ours (the server may fill in who ends the game, so compare the kind of action).
        if (this.pending && this.pending.action.type === msg.action.type) {
          this.pending.resolve(played);
          this.pending = null;
        }
        for (const l of this.listeners) l(played);
        break;
      }
      case 'ranked':
        this.lastRanked = msg;
        this.emit('ranked', msg);
        break;
      case 'rejected':
        this.failPending(msg.reason);
        break;
      case 'error':
        this.closing = true;
        this.emit('error', msg.code);
        break;
    }
  }

  private failPending(reason: string) {
    if (!this.pending) return;
    this.pending.resolve(this.rejected(reason));
    this.pending = null;
  }

  private rejected(reason: string): ActionResult {
    return { state: this.state, events: [{ type: 'ActionRejected', reason }] };
  }
}
