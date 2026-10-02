import { BALANCE } from '../../config/balance';
import type { Ctx } from '../context';
import type { DiceRoll, Player } from '../types';

/**
 * 1d6 + bonuses (+ any pending bonus, which is then spent) against a difficulty.
 * A natural 1 always fails.
 */
export function roll(ctx: Ctx, p: Player, label: string, difficulty: number, bonuses: { label: string; value: number }[]): DiceRoll {
  const all = bonuses.filter((b) => b.value !== 0);
  if (p.pendingBonus) {
    all.push({ label: 'cigarrillos', value: p.pendingBonus });
    p.pendingBonus = 0;
  }
  const die = ctx.rng.int(1, BALANCE.dice.sides);
  const total = die + all.reduce((sum, b) => sum + b.value, 0);
  const success = die !== BALANCE.dice.autoFailOn && total >= difficulty;
  const dice: DiceRoll = { label, roll: die, bonuses: all, total, difficulty, success };
  ctx.emit({ type: 'DiceRolled', playerId: p.id, dice });
  const parts = [String(die), ...all.map((b) => `${b.value} (${b.label})`)].join(' + ');
  ctx.log(`${label}: ${parts} = ${total} ${success ? `≥ ${difficulty} → éxito` : die === 1 ? '→ pifia' : `< ${difficulty} → fallo`}`);
  return dice;
}

/** Chance of success for a roll, for showing it before the player commits. */
export function successChance(difficulty: number, bonus: number) {
  let wins = 0;
  for (let die = 1; die <= BALANCE.dice.sides; die++) if (die !== BALANCE.dice.autoFailOn && die + bonus >= difficulty) wins++;
  return wins / BALANCE.dice.sides;
}
