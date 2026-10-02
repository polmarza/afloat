import { describe, expect, it } from 'vitest';
import { applyAction } from '../../src/engine';
import { makeState, nextRoll } from './fixtures';

describe('systems', () => {
  it('two successful repairs fix a system; the engineer and wrench add bonuses', () => {
    let s = makeState({ rooms: ['engine', 'quarters'] });
    s.players[0].inventory.push('wrench');
    s = applyAction(nextRoll(s, 2), { type: 'REPAIR', playerId: 'p1', target: 'power' }).state;
    expect(s.systems.power.repairProgress).toBe(1);
    s = applyAction(nextRoll(s, 2), { type: 'REPAIR', playerId: 'p1', target: 'power' }).state;
    expect(s.systems.power.repaired).toBe(true);
  });

  it('restoring power reveals the rooms behind the explored doors', () => {
    let s = makeState({ rooms: ['engine', 'quarters', 'pumps'] });
    s.systems.power.repairProgress = 1;
    s = applyAction(nextRoll(s, 6), { type: 'REPAIR', playerId: 'p1', target: 'power' }).state;
    expect(s.rooms.r1).toMatchObject({ discovered: true, lit: true });
    expect(s.rooms.r2.discovered).toBe(false);
  });

  it('you can only repair what is in your room', () => {
    const { events } = applyAction(makeState(), { type: 'REPAIR', playerId: 'p1', target: 'pumps' });
    expect(events[0]).toEqual({ type: 'ActionRejected', reason: 'Eso no está en tu sala.' });
  });
});

describe('escape', () => {
  const podState = () => {
    const s = makeState({ rooms: ['escape_pod', 'quarters'], roles: ['engineer', 'medic', 'soldier', 'hacker'] });
    s.escapePod.repairProgress = 2;
    s.escapePod.seats = 3;
    return s;
  };

  it('the pod takes at most its seats', () => {
    const { events } = applyAction(podState(), { type: 'LAUNCH_POD', playerId: 'p1', passengers: ['p1', 'p2', 'p3', 'p4'] });
    expect(events[0]).toEqual({ type: 'ActionRejected', reason: 'La cápsula solo tiene 3 plazas.' });
  });

  it('a launch saves the passengers; the game goes on for whoever stays conscious aboard', () => {
    const { state } = applyAction(podState(), { type: 'LAUNCH_POD', playerId: 'p1', passengers: ['p1', 'p2', 'p3'] });
    expect(state.players.filter((p) => p.escaped).map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    expect(state.status).toBe('playing');
    expect(state.players[state.activePlayerIndex].id).toBe('p4');
    expect(state.escapePod.launched).toBe(true);
  });

  it('once someone escaped, running out of oxygen is still a victory', () => {
    let s = applyAction(podState(), { type: 'LAUNCH_POD', playerId: 'p1', passengers: ['p1', 'p2', 'p3'] }).state;
    s.oxygen = 1;
    s = applyAction(s, { type: 'PASS', playerId: 'p4' }).state;
    expect(s.status).toBe('won');
  });

  it('surfacing needs power and pumps, and saves everyone alive', () => {
    const s = makeState({ rooms: ['bridge', 'quarters'], roles: ['engineer', 'medic'] });
    expect(applyAction(s, { type: 'SURFACE', playerId: 'p1' }).events[0].type).toBe('ActionRejected');
    s.systems.power.repaired = true;
    s.systems.pumps.repaired = true;
    s.players[1].condition = 'unconscious';
    s.players[1].health = 0;
    const { state } = applyAction(s, { type: 'SURFACE', playerId: 'p1' });
    expect(state.status).toBe('won');
    expect(state.players.every((p) => p.escaped)).toBe(true);
  });
});

describe('capsule seats', () => {
  it('always seat one person, whatever the crew size', async () => {
    const { createGame } = await import('../../src/engine');
    for (const n of [2, 3, 4, 5]) {
      const roles = ['engineer', 'medic', 'soldier', 'hacker', 'diver'] as const;
      const { state } = createGame({ seed: 'seats', players: roles.slice(0, n).map((role, i) => ({ name: `J${i}`, role })) });
      expect(state.escapePod.seats).toBe(1);
    }
  });
});
