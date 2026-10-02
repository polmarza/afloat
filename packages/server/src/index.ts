// Cloudflare Worker: serves the game page and the online rooms.
//   POST /api/rooms            → creates a room, answers { code }
//   GET  /api/rooms/:code/ws   → WebSocket into that room's Durable Object
//   GET  /api/ranking?me=…     → online ranking (D1)
//   anything else              → the static client (assets)

import { DurableObject } from 'cloudflare:workers';
import { isRoomCode, MAX_MESSAGE_BYTES, ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, type ClientMessage } from '@afloat/shared/net/protocol';
import type { GameEvent } from '@afloat/shared/engine';
import { SERVER } from './config';
import { readRanking, recordGame } from './ranking';
import { Room, type Outgoing, type RoomData } from './room';

export interface Env {
  ASSETS: Fetcher;
  ROOMS: DurableObjectNamespace<RoomObject>;
  DB: D1Database;
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return [...bytes].map((b) => ROOM_CODE_ALPHABET[b % ROOM_CODE_ALPHABET.length]).join('');
}

function randomSeed() {
  return [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      for (let i = 0; i < SERVER.codeAttempts; i++) {
        const code = randomCode();
        if (await env.ROOMS.getByName(code).init(code)) return json({ code });
      }
      return json({ error: 'busy' }, 503);
    }
    const ws = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]+)\/ws$/);
    if (ws) {
      if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
      if (!isRoomCode(ws[1])) return new Response('Not found', { status: 404 });
      return env.ROOMS.getByName(ws[1]).fetch(request);
    }
    if (url.pathname === '/api/ranking' && request.method === 'GET') {
      const me = url.searchParams.get('me');
      try {
        return json(await readRanking(env.DB, me && /^[0-9a-f]{64}$/.test(me) ? me : null));
      } catch (err) {
        console.error('ranking read failed', err);
        return json({ error: 'unavailable' }, 503);
      }
    }
    if (url.pathname.startsWith('/api/')) return new Response('Not found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

/** One room. Sleeps between messages (WebSocket hibernation); its state lives in storage. */
export class RoomObject extends DurableObject<Env> {
  private room: Room | null = null;
  /** When the next computer action is due (0 = none). */
  private botAt = 0;

  /** Claims the code for a new room. False if it is already in use. */
  async init(code: string): Promise<boolean> {
    if (await this.ctx.storage.get('room')) return false;
    this.room = Room.create(code, randomSeed);
    await this.save();
    await this.schedule();
    return true;
  }

  async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const conn = crypto.randomUUID();
    this.ctx.acceptWebSocket(server, [conn]);
    server.serializeAttachment({ conn });
    if (!(await this.load())) {
      server.send(JSON.stringify({ type: 'error', code: 'not_found' }));
      server.close(4004, 'not found');
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const room = await this.load();
    if (!room || typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES) return;
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }
    const conn = this.connOf(ws);
    const out = room.receive(conn, msg);
    this.send(out);
    // Unknown players are turned away after the error goes out.
    if (!(conn in room.data.conns)) ws.close(4000, 'not joined');
    this.afterChange(out);
    await this.save();
    await this.schedule();
    await this.recordFinished();
  }

  async webSocketClose(ws: WebSocket) {
    await this.dropped(ws);
  }

  async webSocketError(ws: WebSocket) {
    await this.dropped(ws);
  }

  async alarm() {
    const room = await this.load();
    if (!room) return;
    const now = Date.now();
    if (room.serverTurn && this.botAt && now >= this.botAt) {
      const { out } = room.botStep();
      this.send(out);
      this.botAt = 0;
      this.afterChange(out);
      await this.save();
      await this.recordFinished();
    }
    const emptySince = (await this.ctx.storage.get<number>('emptySince')) ?? 0;
    if (room.connectionCount === 0 && emptySince && now - emptySince >= SERVER.emptyRoomTtlMs) {
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
      this.room = null;
      return;
    }
    await this.schedule();
  }

  // -------------------------------------------------------------- helpers

  /** A ranked game just ended: into the ranking, and each player hears their points and places. */
  private async recordFinished() {
    const room = this.room;
    const game = room?.finished;
    if (!room || !game) return;
    room.finished = null;
    try {
      const places = await recordGame(this.env.DB, game, Date.now());
      this.send(
        room.connectionKeys().map(([to, key]) => {
          const mine = places.get(key);
          return {
            to,
            msg: mine ? { type: 'ranked', counted: true, points: game.score, total: mine.total, best: mine.best } : { type: 'ranked', counted: false, reason: 'error' },
          };
        }),
      );
    } catch (err) {
      console.error('ranking write failed', game.id, err);
      this.send(room.connectionKeys().map(([to]) => ({ to, msg: { type: 'ranked', counted: false, reason: 'error' } })));
    }
  }

  private async dropped(ws: WebSocket) {
    const room = await this.load();
    if (!room) return;
    const out = room.close(this.connOf(ws));
    this.send(out);
    this.afterChange(out);
    await this.save();
    await this.schedule();
  }

  private connOf(ws: WebSocket) {
    return (ws.deserializeAttachment() as { conn: string }).conn;
  }

  /** Loads the room after waking up, forgetting connections lost in a restart. */
  private async load(): Promise<Room | null> {
    if (this.room) return this.room;
    const data = await this.ctx.storage.get<RoomData>('room');
    if (!data) return null;
    this.room = new Room(data, randomSeed);
    this.botAt = (await this.ctx.storage.get<number>('botAt')) ?? 0;
    const alive = new Set(this.ctx.getWebSockets().map((ws) => this.connOf(ws)));
    this.send(this.room.keepConnections(alive));
    return this.room;
  }

  private async save() {
    if (!this.room) return;
    await this.ctx.storage.put('room', this.room.data);
    await this.ctx.storage.put('botAt', this.botAt);
    const empty = this.room.connectionCount === 0;
    const since = (await this.ctx.storage.get<number>('emptySince')) ?? 0;
    if (empty && !since) await this.ctx.storage.put('emptySince', Date.now());
    if (!empty && since) await this.ctx.storage.delete('emptySince');
  }

  /**
   * When the computer has to play next, give the clients time to animate what
   * just happened first (the more events, the longer).
   */
  private afterChange(out: Outgoing[]) {
    const room = this.room!;
    if (!room.serverTurn) {
      this.botAt = 0;
      return;
    }
    if (this.botAt) return;
    let events: GameEvent[] = [];
    for (const { msg } of out) {
      if (msg.type === 'result') events = msg.events;
      else if (msg.type === 'started') events = msg.startEvents;
    }
    this.botAt = Date.now() + Math.min(SERVER.botPauseMaxMs, SERVER.botPauseMs + events.length * SERVER.botPausePerEventMs);
  }

  /** One alarm covers both the computer's next move and the cleanup of an empty room. */
  private async schedule() {
    const room = this.room;
    if (!room) return;
    // Never leave the computer's turn without a move scheduled (e.g. after a restart).
    if (room.serverTurn && !this.botAt) this.botAt = Date.now() + SERVER.botPauseMs;
    if (!room.serverTurn) this.botAt = 0;
    const times: number[] = [];
    if (room.serverTurn && this.botAt) times.push(this.botAt);
    const since = (await this.ctx.storage.get<number>('emptySince')) ?? 0;
    if (room.connectionCount === 0 && since) times.push(since + SERVER.emptyRoomTtlMs);
    await this.ctx.storage.put('botAt', this.botAt);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  private send(out: Outgoing[]) {
    if (!out.length) return;
    const sockets = new Map(this.ctx.getWebSockets().map((ws) => [this.connOf(ws), ws]));
    for (const { to, msg } of out) {
      try {
        sockets.get(to)?.send(JSON.stringify(msg));
      } catch {
        // The socket is closing; its close handler will tidy up.
      }
    }
  }
}
