import { describe, expect, it } from 'vitest';
import { applyAction, successChance } from '../../src/engine';
import { makeState, nextRoll } from './fixtures';

const open = (s: ReturnType<typeof makeState>, playerId = 'p1', doorId = 'd0') => applyAction(s, { type: 'OPEN_DOOR', playerId, doorId });

describe('doors', () => {
  it('a normal door opens and reveals the room behind it', () => {
    const { state, events } = open(makeState());
    expect(state.doors.d0.open).toBe(true);
    expect(state.rooms.r1.discovered).toBe(true);
    expect(state.actionsLeft).toBe(2);
    expect(events.map((e) => e.type)).toContain('RoomRevealed');
  });

  it('a key door needs an access card, and a refused attempt is free', () => {
    const s = makeState({ doors: ['key'] });
    const refused = open(s);
    expect(refused.state).toBe(s);
    expect(refused.events[0]).toEqual({ type: 'ActionRejected', reason: 'Necesitas una tarjeta de acceso.' });

    s.players[0].inventory.push('access_card');
    const ok = open(s);
    expect(ok.state.doors.d0.open).toBe(true);
    expect(ok.state.players[0].inventory).toContain('access_card');
  });

  it('a one-way door only opens from its side', () => {
    const s = makeState({ doors: ['one_way'] }); // openable from r1
    expect(open(s).events[0]).toEqual({ type: 'ActionRejected', reason: 'Está bloqueada desde el otro lado.' });
  });

  it('hacking rolls with the hacker and laptop bonuses', () => {
    const s = nextRoll(makeState({ doors: ['hack'], roles: ['hacker', 'medic'] }), 2);
    s.players[0].inventory.push('laptop');
    const { state, events } = open(s);
    const rolled = events.find((e) => e.type === 'DiceRolled');
    expect(rolled && rolled.type === 'DiceRolled' && rolled.dice.total).toBe(5);
    expect(state.doors.d0.open).toBe(true);
  });

  it('a failed roll still spends the action', () => {
    const { state } = open(nextRoll(makeState({ doors: ['hack'] }), 3));
    expect(state.doors.d0.open).toBe(false);
    expect(state.actionsLeft).toBe(2);
  });

  it('a natural 1 always fails', () => {
    const s = nextRoll(makeState({ doors: ['jammed'], roles: ['soldier', 'medic'] }), 1);
    s.players[0].inventory.push('crowbar');
    expect(open(s).state.doors.d0.open).toBe(false);
  });

  it('hack doors open without a roll once power is back', () => {
    const s = makeState({ doors: ['hack'] });
    s.systems.power.repaired = true;
    const { state, events } = open(s);
    expect(state.doors.d0.open).toBe(true);
    expect(events.some((e) => e.type === 'DiceRolled')).toBe(false);
  });

  it('shows the success chance before rolling (soldier forcing: 3+ on a d6)', () => {
    expect(successChance(5, 2)).toBeCloseTo(4 / 6);
  });

  it('the hacker can scan a closed door', () => {
    const { state } = applyAction(makeState({ roles: ['hacker', 'medic'] }), { type: 'SCAN', playerId: 'p1', doorId: 'd0' });
    expect(state.rooms.r1.scanned).toBe(true);
    expect(state.rooms.r1.discovered).toBe(false);
  });
});

describe('movement', () => {
  it('moves through an open door for one action', () => {
    let s = open(makeState()).state;
    s = applyAction(s, { type: 'MOVE', playerId: 'p1', toRoomId: 'r1' }).state;
    expect(s.players[0].roomId).toBe('r1');
    expect(s.actionsLeft).toBe(1);
  });

  it('rejects moving through a closed door', () => {
    const { events } = applyAction(makeState(), { type: 'MOVE', playerId: 'p1', toRoomId: 'r1' });
    expect(events[0]).toEqual({ type: 'ActionRejected', reason: 'La puerta está cerrada.' });
  });

  it('wading into a flooded room costs two actions, one for the diver', () => {
    const s = open(makeState({ roles: ['engineer', 'diver'] })).state;
    s.rooms.r1.flooded = true;
    // Two actions left, both spent: the turn passes to the next player.
    const after = applyAction(s, { type: 'MOVE', playerId: 'p1', toRoomId: 'r1' }).state;
    expect(after.players[0].roomId).toBe('r1');
    expect(after.players[after.activePlayerIndex].id).toBe('p2');

    const d = open(makeState({ roles: ['diver', 'engineer'] })).state;
    d.rooms.r1.flooded = true;
    expect(applyAction(d, { type: 'MOVE', playerId: 'p1', toRoomId: 'r1' }).state.actionsLeft).toBe(1);
  });

  it('refuses a move that costs more actions than are left', () => {
    let s = open(makeState()).state;
    s = applyAction(s, { type: 'SEARCH', playerId: 'p1' }).state;
    s.rooms.r1.flooded = true;
    expect(applyAction(s, { type: 'MOVE', playerId: 'p1', toRoomId: 'r1' }).events[0].type).toBe('ActionRejected');
  });

  it('nobody can enter a burning room', () => {
    const s = open(makeState()).state;
    s.rooms.r1.fireRoundsLeft = 2;
    expect(applyAction(s, { type: 'MOVE', playerId: 'p1', toRoomId: 'r1' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'Esa sala está en llamas.',
    });
  });
});
