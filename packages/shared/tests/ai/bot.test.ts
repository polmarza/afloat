import { describe, expect, it } from 'vitest';
import { createBotMemory, decide, observe } from '../../src/ai/bot';
import { ROLE_ORDER } from '../../src/content/roles';
import { applyAction, createGame, type GameState } from '../../src/engine';

function playBots(seed: string, players: number) {
  let s: GameState = createGame({
    seed,
    players: ROLE_ORDER.slice(0, players).map((role, i) => ({ name: `M${i}`, role, bot: true })),
  }).state;
  const memory = createBotMemory();
  let rejected = 0;
  for (let step = 0; step < 3000 && s.status === 'playing'; step++) {
    const action = decide(s, memory);
    const { state, events } = applyAction(s, action);
    if (events[0]?.type === 'ActionRejected') rejected++;
    observe(memory, s, events);
    s = state;
  }
  return { s, rejected };
}

describe('classic bot', () => {
  it('only picks legal actions and always finishes the game', () => {
    for (let g = 0; g < 60; g++) {
      const { s, rejected } = playBots(`bot-${g}`, 2 + (g % 4));
      expect(rejected).toBe(0);
      expect(s.status).not.toBe('playing');
    }
  }, 60_000);

  it('wins a reasonable share of games on its own', () => {
    let won = 0;
    const games = 120;
    for (let g = 0; g < games; g++) if (playBots(`balance-${g}`, 2 + (g % 4)).s.status === 'won') won++;
    // Not a balance target: just a guard against a bot that never escapes.
    expect(won / games).toBeGreaterThan(0.15);
  }, 120_000);
});
