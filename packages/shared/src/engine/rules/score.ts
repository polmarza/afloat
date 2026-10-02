// Final score of a game, won or lost: the same formula for both.

import { BALANCE } from '../../config/balance';
import type { GameState } from '../types';

export interface ScoreLine {
  label: string;
  /** How many of the thing (crew saved, oxygen left, rounds…). */
  count: number;
  points: number;
}

export interface Score {
  lines: ScoreLine[];
  /** Sum of the lines (never below 0), before the difficulty multiplier. */
  base: number;
  multiplier: number;
  /** base × multiplier, rounded. */
  total: number;
}

export function scoreGame(s: GameState): Score {
  const k = BALANCE.score;
  const saved = s.players.filter((p) => p.escaped).length;
  const dead = s.players.filter((p) => p.condition === 'dead').length;
  const systems = Object.values(s.systems).filter((sys) => sys.repaired).length;
  const oxygen = Math.floor(s.oxygen);
  const lines: ScoreLine[] = [
    { label: 'Tripulantes a salvo', count: saved, points: saved * k.perSaved },
    { label: 'Emergisteis con el submarino', count: s.surfaced ? 1 : 0, points: s.surfaced ? k.surfaceBonus : 0 },
    { label: 'Oxígeno restante', count: oxygen, points: oxygen * k.perOxygen },
    { label: 'Integridad del casco', count: s.hull, points: s.hull * k.perHull },
    { label: 'Sistemas reparados', count: systems, points: systems * k.perSystem },
    { label: 'Muertos', count: dead, points: dead * k.perDead },
    { label: 'Rondas jugadas', count: s.round, points: s.round * k.perRound },
  ];
  const base = Math.max(0, lines.reduce((sum, l) => sum + l.points, 0));
  const multiplier = k.multiplier[s.difficulty];
  return { lines, base, multiplier, total: Math.round(base * multiplier) };
}
