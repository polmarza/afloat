// Best scores, kept in this browser for now. Each record stores the setup and
// every action taken: the engine is deterministic, so a future server can
// replay them (engine `replay`) and check the score before accepting it.

import type { Difficulty } from '@afloat/shared/content/difficulty';
import type { Action, GameState, NewGame } from '@afloat/shared/engine';

export interface GameRecord {
  /** Record format, for a future upload. */
  v: 1;
  id: string;
  /** ISO date when the game ended. */
  date: string;
  game: NewGame;
  actions: Action[];
  difficulty: Difficulty;
  status: Exclude<GameState['status'], 'playing'>;
  rounds: number;
  saved: number;
  score: number;
}

const KEY = 'afloat.records.v1';
const MAX = 10;

export function loadRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as GameRecord[]) : [];
    return Array.isArray(list) ? list.filter((r) => r?.v === 1) : [];
  } catch {
    return [];
  }
}

/** Adds a finished game; returns its position (1-based) or null if it didn't make the table. */
export function saveRecord(record: GameRecord): { rank: number | null; records: GameRecord[] } {
  const records = [...loadRecords(), record].sort((a, b) => b.score - a.score || a.date.localeCompare(b.date)).slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // Storage full or blocked: the table just isn't kept.
  }
  const i = records.findIndex((r) => r.id === record.id);
  return { rank: i >= 0 ? i + 1 : null, records };
}

export function newRecord(game: NewGame, actions: readonly Action[], s: GameState, score: number): GameRecord {
  const date = new Date().toISOString();
  return {
    v: 1,
    id: `${date}-${s.seed}`,
    date,
    game: structuredClone(game),
    actions: structuredClone([...actions]),
    difficulty: s.difficulty,
    status: s.status === 'won' ? 'won' : 'lost',
    rounds: s.round,
    saved: s.players.filter((p) => p.escaped).length,
    score,
  };
}
