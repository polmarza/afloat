import { describe, expect, it } from 'vitest';
import { ROLE_ORDER } from '../../src/content/roles';
import { applyAction, createGame, type Action, type GameState } from '../../src/engine';
import { Rng } from '../../src/engine/rng';

/** Every action a player could try right now (many will be rejected, which is fine). */
function candidates(s: GameState): Action[] {
  const p = s.players[s.activePlayerIndex];
  const id = p.id;
  const doors = Object.values(s.doors).filter((d) => d.roomA === p.roomId || d.roomB === p.roomId);
  const mates = s.players.filter((o) => o.id !== id);
  return [
    { type: 'PASS', playerId: id },
    { type: 'SEARCH', playerId: id },
    { type: 'PUMP_OUT', playerId: id },
    { type: 'SURFACE', playerId: id },
    { type: 'LAUNCH_POD', playerId: id, passengers: [id] },
    ...(['power', 'life_support', 'pumps', 'escape_pod'] as const).map((target) => ({ type: 'REPAIR' as const, playerId: id, target })),
    ...doors.flatMap((d) => [
      { type: 'OPEN_DOOR' as const, playerId: id, doorId: d.id },
      { type: 'SCAN' as const, playerId: id, doorId: d.id },
      { type: 'MOVE' as const, playerId: id, toRoomId: d.roomA === p.roomId ? d.roomB : d.roomA },
    ]),
    ...p.inventory.map((item) => ({ type: 'USE_ITEM' as const, playerId: id, item })),
    ...mates.flatMap((m) => [
      { type: 'HEAL' as const, playerId: id, targetId: m.id },
      { type: 'REVIVE' as const, playerId: id, targetId: m.id },
      ...p.inventory.map((item) => ({ type: 'GIVE_ITEM' as const, playerId: id, targetId: m.id, item })),
    ]),
  ];
}

describe('random play', () => {
  it('always reaches the end of the game without errors', () => {
    const outcomes = { won: 0, lost: 0 };
    for (let g = 0; g < 100; g++) {
      const n = 2 + (g % 4);
      const pick = new Rng({ rngState: g * 7919 });
      let s = createGame({ seed: `fuzz-${g}`, players: ROLE_ORDER.slice(0, n).map((role, i) => ({ name: `J${i}`, role })) }).state;
      for (let step = 0; step < 5000 && s.status === 'playing'; step++) {
        // Prefer moving forward: try non-PASS actions most of the time.
        const options = candidates(s);
        const action = pick.chance(0.08) ? options[0] : pick.pick(options.slice(1));
        s = applyAction(s, action).state;
      }
      expect(s.status).not.toBe('playing');
      outcomes[s.status as 'won' | 'lost']++;
    }
    expect(outcomes.won + outcomes.lost).toBe(100);
  }, 60_000);
});
