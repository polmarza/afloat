import { describe, expect, it } from 'vitest';
import { BALANCE } from '@afloat/shared/config/balance';
import { ROLE_ORDER } from '@afloat/shared/content/roles';
import type { ServerMessage } from '@afloat/shared/net/protocol';
import { Room, type Outgoing } from '../src/room';

const newRoom = () => Room.create('K7QFM', () => 'TESTSEED');

const to = (out: Outgoing[], conn: string) => out.filter((o) => o.to === conn).map((o) => o.msg);
const last = <T extends ServerMessage['type']>(out: Outgoing[], conn: string, type: T) =>
  to(out, conn).filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type).at(-1);

/** Ana (host) and Luis in the lobby, each with a character. */
function lobbyOfTwo() {
  const room = newRoom();
  room.receive('c1', { type: 'hello', key: 'ana', name: 'Ana' });
  room.receive('c2', { type: 'hello', key: 'luis', name: 'Luis' });
  room.receive('c1', { type: 'pick', role: 'engineer' });
  room.receive('c2', { type: 'pick', role: 'medic' });
  return room;
}

function startedOfTwo() {
  const room = lobbyOfTwo();
  room.receive('c1', { type: 'start' });
  return room;
}

describe('lobby', () => {
  it('makes whoever creates the room its host and shows newcomers to everyone', () => {
    const room = newRoom();
    room.receive('c1', { type: 'hello', key: 'ana', name: 'Ana' });
    const out = room.receive('c2', { type: 'hello', key: 'luis', name: '  Luis  ' });
    const seen = last(out, 'c1', 'room')!;
    expect(seen.room.seats.map((s) => [s.name, s.host])).toEqual([
      ['Ana', true],
      ['Luis', false],
    ]);
    expect(last(out, 'c2', 'room')!.you).toBe(1);
  });

  it('turns people away when the room is full', () => {
    const room = newRoom();
    for (let i = 0; i < BALANCE.crew.max; i++) room.receive(`c${i}`, { type: 'hello', key: `k${i}`, name: `P${i}` });
    const out = room.receive('late', { type: 'hello', key: 'late', name: 'Tarde' });
    expect(last(out, 'late', 'error')!.code).toBe('full');
    expect(room.data.seats).toHaveLength(BALANCE.crew.max);
  });

  it('does not let two players take the same character', () => {
    const room = lobbyOfTwo();
    room.receive('c2', { type: 'pick', role: 'engineer' });
    expect(room.data.seats[1].role).toBe('medic');
  });

  it('lets only the host add computer crew, with a free character', () => {
    const room = lobbyOfTwo();
    room.receive('c2', { type: 'addBot', role: 'diver' });
    expect(room.data.seats).toHaveLength(2);
    room.receive('c1', { type: 'addBot', role: 'engineer' });
    expect(room.data.seats).toHaveLength(2);
    room.receive('c1', { type: 'addBot', role: 'diver' });
    expect(room.view().seats[2]).toMatchObject({ bot: true, role: 'diver' });
    room.receive('c1', { type: 'removeBot', seat: 2 });
    expect(room.data.seats).toHaveLength(2);
  });

  it('needs at least two crew members, all with a character, to start', () => {
    const room = newRoom();
    room.receive('c1', { type: 'hello', key: 'ana', name: 'Ana' });
    room.receive('c1', { type: 'pick', role: 'engineer' });
    room.receive('c1', { type: 'start' });
    expect(room.data.phase).toBe('lobby');
    room.receive('c2', { type: 'hello', key: 'luis', name: 'Luis' });
    room.receive('c1', { type: 'start' });
    expect(room.data.phase).toBe('lobby');
  });

  it('starts with the host, a computer crew member played by the server', () => {
    const room = lobbyOfTwo();
    room.receive('c1', { type: 'addBot', role: 'diver' });
    room.receive('c2', { type: 'start' });
    expect(room.data.phase).toBe('lobby');
    const out = room.receive('c1', { type: 'start' });
    const started = last(out, 'c2', 'started')!;
    expect(started.setup.players.map((p) => [p.role, !!p.bot])).toEqual([
      ['engineer', false],
      ['medic', false],
      ['diver', true],
    ]);
    expect(started.setup.seed).toBe('TESTSEED');
  });

  it('frees the seat of someone who leaves the lobby and passes the host on', () => {
    const room = lobbyOfTwo();
    const out = room.close('c1');
    const seen = last(out, 'c2', 'room')!;
    expect(seen.room.seats).toHaveLength(1);
    expect(seen.room.seats[0]).toMatchObject({ name: 'Luis', host: true });
    expect(seen.you).toBe(0);
  });

  it('keeps the seat while the same player has another tab open', () => {
    const room = lobbyOfTwo();
    room.receive('c1b', { type: 'hello', key: 'ana', name: 'Ana' });
    room.close('c1');
    expect(room.data.seats).toHaveLength(2);
  });
});

describe('game', () => {
  it('lets only the player in turn act, and shows the result to everyone', () => {
    const room = startedOfTwo();
    const state = room.data.game!.state;
    const active = state.activePlayerIndex;
    const activeConn = active === 0 ? 'c1' : 'c2';
    const otherConn = active === 0 ? 'c2' : 'c1';
    const activeId = state.players[active].id;

    const wrong = room.receive(otherConn, { type: 'action', action: { type: 'PASS', playerId: activeId } });
    expect(last(wrong, otherConn, 'rejected')).toBeTruthy();

    const out = room.receive(activeConn, { type: 'action', action: { type: 'SEARCH', playerId: activeId } });
    const seen = last(out, otherConn, 'result')!;
    expect(seen.seq).toBe(1);
    expect(seen.action.type).toBe('SEARCH');
  });

  it('passes on the engine rejection to the player who sent it', () => {
    const room = startedOfTwo();
    const state = room.data.game!.state;
    const active = state.activePlayerIndex;
    const conn = active === 0 ? 'c1' : 'c2';
    const out = room.receive(conn, { type: 'action', action: { type: 'SURFACE', playerId: state.players[active].id } });
    expect(last(out, conn, 'rejected')!.reason).toBeTruthy();
    expect(room.data.game!.actions).toHaveLength(0);
  });

  it('does not let newcomers in once the game has started', () => {
    const room = startedOfTwo();
    const out = room.receive('c3', { type: 'hello', key: 'eva', name: 'Eva' });
    expect(last(out, 'c3', 'error')!.code).toBe('in_progress');
  });

  it('marks a dropped player, lets the host hand them to the computer, and gives the seat back on return', () => {
    const room = startedOfTwo();
    room.close('c2');
    expect(room.view().seats[1]).toMatchObject({ connected: false, takenOver: false });

    room.receive('c2x', { type: 'hello', key: 'eva', name: 'Eva' });
    room.receive('c1', { type: 'botTakeover', seat: 1 });
    expect(room.data.seats[1].takenOver).toBe(true);

    const out = room.receive('c2b', { type: 'hello', key: 'luis', name: 'Luis' });
    expect(room.data.seats[1]).toMatchObject({ connected: true, takenOver: false });
    expect(last(out, 'c2b', 'snapshot')!.state).toEqual(room.data.game!.state);
  });

  it('only allows taking over someone who is away', () => {
    const room = startedOfTwo();
    room.receive('c1', { type: 'botTakeover', seat: 1 });
    expect(room.data.seats[1].takenOver).toBe(false);
  });

  it('passes the host on when the host drops during the game', () => {
    const room = startedOfTwo();
    const out = room.close('c1');
    expect(last(out, 'c2', 'room')!.room.seats[1].host).toBe(true);
  });

  it('plays the computer crew members until a human has the turn', () => {
    const room = newRoom();
    room.receive('c1', { type: 'hello', key: 'ana', name: 'Ana' });
    room.receive('c1', { type: 'pick', role: 'engineer' });
    room.receive('c1', { type: 'addBot', role: 'medic' });
    room.receive('c1', { type: 'addBot', role: 'soldier' });
    room.receive('c1', { type: 'start' });
    let steps = 0;
    while (room.data.game!.state.status === 'playing') {
      const g = room.data.game!;
      if (room.serverTurn) {
        const { out } = room.botStep();
        expect(last(out, 'c1', 'result')).toBeTruthy();
      } else {
        room.receive('c1', { type: 'action', action: { type: 'PASS', playerId: g.state.players[g.state.activePlayerIndex].id } });
      }
      expect(++steps).toBeLessThan(2000);
    }
    expect(room.data.phase).toBe('ended');
  });

  it('lets the host call it a day for the computer after an escape', () => {
    const room = startedOfTwo();
    const g = room.data.game!;
    // Pretend someone already escaped and it is a computer's turn.
    g.state.players[1].escaped = true;
    room.data.seats[1].connected = false;
    room.data.seats[1].takenOver = true;
    g.state.activePlayerIndex = 1;
    const out = room.receive('c1', { type: 'action', action: { type: 'END_GAME', playerId: g.state.players[0].id } });
    expect(last(out, 'c1', 'result')!.action).toEqual({ type: 'END_GAME', playerId: g.state.players[1].id });
    expect(room.data.phase).toBe('ended');
  });

  it('goes back to the lobby for another game, without those who left', () => {
    const room = startedOfTwo();
    room.data.phase = 'ended';
    room.close('c2');
    room.receive('c2', { type: 'rematch' });
    expect(room.data.phase).toBe('ended');
    const out = room.receive('c1', { type: 'rematch' });
    expect(last(out, 'c1', 'room')!.room).toMatchObject({ phase: 'lobby', seats: [{ name: 'Ana', role: 'engineer' }] });
    expect(room.data.game).toBeNull();
  });

  it('forgets connections lost in a restart', () => {
    const room = startedOfTwo();
    room.keepConnections(new Set(['c1']));
    expect(room.data.seats[1].connected).toBe(false);
    expect(room.connectionCount).toBe(1);
  });

  it('survives being stored as JSON', () => {
    const room = startedOfTwo();
    const copy = new Room(JSON.parse(JSON.stringify(room.data)), () => 'X');
    expect(copy.view()).toEqual(room.view());
    expect(ROLE_ORDER).toContain(copy.data.seats[0].role);
  });
});

describe('ranking', () => {
  it('counts a game when every seat was human at the start', () => {
    const room = lobbyOfTwo();
    expect(room.view().ranked).toBe(true);
    room.receive('c1', { type: 'start' });
    // Almost out of oxygen: passing a round ends the game.
    room.data.game!.state.oxygen = 0.1;
    let guard = 0;
    while (room.data.phase === 'playing' && guard++ < 500) {
      const s = room.data.game!.state;
      const conn = s.activePlayerIndex === 0 ? 'c1' : 'c2';
      room.receive(conn, { type: 'action', action: { type: 'PASS', playerId: s.players[s.activePlayerIndex].id } });
    }
    expect(room.data.phase).toBe('ended');
    expect(room.finished).toMatchObject({ id: 'K7QFM-1', room: 'K7QFM', players: [{ key: 'ana', name: 'Ana' }, { key: 'luis', name: 'Luis' }] });
  });

  it('still counts when the computer stood in for someone who dropped', () => {
    const room = startedOfTwo();
    room.close('c2');
    room.receive('c1', { type: 'botTakeover', seat: 1 });
    expect(room.view().ranked).toBe(true);
  });

  it('does not count games with computer crew, and says why', () => {
    const room = lobbyOfTwo();
    room.receive('c1', { type: 'addBot', role: 'diver' });
    expect(room.view().ranked).toBe(false);
    room.receive('c1', { type: 'start' });
    room.data.game!.state.oxygen = 0.1;
    let out: Outgoing[] = [];
    let guard = 0;
    while (room.data.phase === 'playing' && guard++ < 500) {
      const s = room.data.game!.state;
      if (room.serverTurn) out = room.botStep().out;
      else {
        const conn = s.activePlayerIndex === 0 ? 'c1' : 'c2';
        out = room.receive(conn, { type: 'action', action: { type: 'PASS', playerId: s.players[s.activePlayerIndex].id } });
      }
    }
    expect(room.finished).toBeNull();
    expect(last(out, 'c1', 'ranked')).toEqual({ type: 'ranked', counted: false, reason: 'bots' });
  });
});
