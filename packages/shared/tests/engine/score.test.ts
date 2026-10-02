import { describe, expect, it } from 'vitest';
import { createBotMemory, decide, observe } from '../../src/ai/bot';
import { BALANCE } from '../../src/config/balance';
import { ROLE_ORDER } from '../../src/content/roles';
import { applyAction, createGame, replay, scoreGame, type Action, type GameState, type NewGame } from '../../src/engine';
import { makeState } from './fixtures';

const k = BALANCE.score;

describe('score', () => {
  it('adds saved crew, surfacing, oxygen, hull and repairs, minus deaths and rounds', () => {
    const s = makeState({ roles: ['engineer', 'medic', 'soldier'] });
    s.players[0].escaped = true;
    s.players[1].escaped = true;
    s.players[2].condition = 'dead';
    s.surfaced = true;
    s.oxygen = 40.5;
    s.hull = 12;
    s.round = 9;
    s.systems.power.repaired = true;
    s.systems.pumps.repaired = true;
    const expected = 2 * k.perSaved + k.surfaceBonus + 40 * k.perOxygen + 12 * k.perHull + 2 * k.perSystem + k.perDead + 9 * k.perRound;
    s.difficulty = 'easy';
    expect(scoreGame(s).total).toBe(expected);
  });

  it('the difficulty multiplier scales the total', () => {
    const s = makeState();
    s.oxygen = 50;
    const base = scoreGame({ ...s, difficulty: 'easy' }).total;
    expect(scoreGame({ ...s, difficulty: 'hard' }).total).toBe(Math.round(base * k.multiplier.hard));
    expect(scoreGame({ ...s, difficulty: 'normal' }).multiplier).toBe(k.multiplier.normal);
  });

  it('a defeat uses the same formula but never goes below 0', () => {
    const s = makeState();
    s.oxygen = 0;
    s.hull = 3;
    s.round = 6;
    expect(scoreGame(s).total).toBe(Math.max(0, 3 * k.perHull + 6 * k.perRound));
    s.players.forEach((p) => (p.condition = 'dead'));
    s.round = 20;
    expect(scoreGame(s).total).toBe(0);
  });
});

describe('replay', () => {
  it('rebuilds the same final state (and score) from the setup and the actions', () => {
    const game: NewGame = { seed: 'REPLAY7', players: ROLE_ORDER.slice(0, 3).map((role, i) => ({ name: `M${i}`, role, bot: true })) };
    let s: GameState = createGame(game).state;
    const memory = createBotMemory();
    const actions: Action[] = [];
    while (s.status === 'playing') {
      const action = decide(s, memory);
      const { state, events } = applyAction(s, action);
      observe(memory, s, events);
      actions.push(action);
      s = state;
    }
    const again = replay(game, actions);
    expect(again).toEqual(s);
    expect(scoreGame(again)).toEqual(scoreGame(s));
  });

  it('refuses an action list the engine would not accept', () => {
    const game: NewGame = { seed: 'X', players: [{ name: 'A', role: 'engineer' }, { name: 'B', role: 'medic' }] };
    expect(() => replay(game, [{ type: 'SURFACE', playerId: 'p1' }])).toThrow(/rejected/);
  });
});
