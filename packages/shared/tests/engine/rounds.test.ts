import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyAction, createGame, oxygenConsumption } from '../../src/engine';
import { makeState } from './fixtures';

describe('game setup', () => {
  it('starts everyone in the lit quarters, at full health, on turn 1', () => {
    const { state } = createGame({ seed: 'ABISMO42', players: [{ name: 'Ana', role: 'soldier' }, { name: 'Bea', role: 'medic' }] });
    const quarters = Object.values(state.rooms).find((r) => r.type === 'quarters')!;
    expect(state.players.every((p) => p.roomId === quarters.id)).toBe(true);
    expect(state.players.map((p) => p.health)).toEqual([4, 3]);
    expect(Object.values(state.rooms).filter((r) => r.discovered).map((r) => r.id)).toEqual([quarters.id]);
    expect(state.phase).toBe('crew');
    expect(state.round).toBe(1);
    expect(state.actionsLeft).toBe(BALANCE.actionsPerTurn);
    // Round 1: oxygen is consumed but no event is drawn.
    expect(state.oxygen).toBe(BALANCE.oxygen.initial - (BALANCE.oxygen.baseConsumption + 2 * BALANCE.oxygen.perCrewMember));
    expect(state.eventDiscard).toHaveLength(0);
  });

  it('rejects repeated roles and wrong player counts', () => {
    expect(() => createGame({ seed: 'x', players: [{ name: 'A', role: 'medic' }] })).toThrow();
    expect(() => createGame({ seed: 'x', players: [{ name: 'A', role: 'medic' }, { name: 'B', role: 'medic' }] })).toThrow();
  });
});

describe('turns', () => {
  it('ends the turn after the last action and passes to the next player', () => {
    let s = makeState();
    s = applyAction(s, { type: 'SEARCH', playerId: 'p1' }).state;
    s = applyAction(s, { type: 'SEARCH', playerId: 'p1' }).state;
    expect(s.actionsLeft).toBe(1);
    s = applyAction(s, { type: 'SEARCH', playerId: 'p1' }).state;
    expect(s.players[s.activePlayerIndex].id).toBe('p2');
    expect(s.actionsLeft).toBe(3);
  });

  it('passing gives up the remaining actions', () => {
    const s = applyAction(makeState(), { type: 'PASS', playerId: 'p1' }).state;
    expect(s.players[s.activePlayerIndex].id).toBe('p2');
  });

  it('rejects actions out of turn without changing the state', () => {
    const before = makeState();
    const { state, events } = applyAction(before, { type: 'SEARCH', playerId: 'p2' });
    expect(state).toBe(before);
    expect(events).toEqual([{ type: 'ActionRejected', reason: 'No es tu turno.' }]);
  });

  it('skips unconscious players', () => {
    const s0 = makeState({ roles: ['engineer', 'medic', 'soldier'] });
    s0.players[1].condition = 'unconscious';
    s0.players[1].health = 0;
    const s = applyAction(s0, { type: 'PASS', playerId: 'p1' }).state;
    expect(s.players[s.activePlayerIndex].id).toBe('p3');
  });

  it('runs consequences and the next crisis after the last turn', () => {
    let s = makeState();
    const oxygen = s.oxygen;
    s = applyAction(s, { type: 'PASS', playerId: 'p1' }).state;
    s = applyAction(s, { type: 'PASS', playerId: 'p2' }).state;
    expect(s.round).toBe(2);
    expect(s.phase).toBe('crew');
    expect(s.players[s.activePlayerIndex].id).toBe('p1');
    expect(s.oxygen).toBe(oxygen - oxygenConsumption(s));
    expect(s.eventDiscard).toEqual(['calm']);
  });

  it('never mutates the input state', () => {
    const s = makeState();
    const copy = structuredClone(s);
    applyAction(s, { type: 'OPEN_DOOR', playerId: 'p1', doorId: 'd0' });
    expect(s).toEqual(copy);
  });
});
