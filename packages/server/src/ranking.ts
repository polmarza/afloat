// Online ranking in D1: every ranked game adds its score to each human player
// (shared score), and keeps their best game. Players are rows keyed by the
// SHA-256 of their browser's secret key, never the key itself.

import { RANKING_SIZE, type RankingResponse, type RankingRow, type RankPosition } from '@afloat/shared/net/protocol';
import type { RankedGame } from './room';

type Board = 'total' | 'best';

/** Column with the points and column with the tie-break time of each ranking (fixed names, never user input). */
const COLUMNS: Record<Board, { points: string; at: string }> = {
  total: { points: 'total', at: 'total_at' },
  best: { points: 'best', at: 'best_at' },
};

/** SHA-256 (hex) of a browser key: how a player is stored and looked up. */
export async function fingerprint(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Writes a finished game and adds it to every player's rows, all at once.
 * Returns each player's new places, by browser key.
 */
export async function recordGame(db: D1Database, game: RankedGame, now: number) {
  const players = await Promise.all(game.players.map(async (p) => ({ ...p, id: await fingerprint(p.key) })));
  await db.batch([
    db
      .prepare('INSERT INTO games (id, room, ended_at, difficulty, status, score, rounds, setup, actions) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
      .bind(game.id, game.room, now, game.difficulty, game.status, game.score, game.rounds, JSON.stringify(game.setup), JSON.stringify(game.actions)),
    ...players.flatMap((p) => [
      db.prepare('INSERT INTO game_players (game_id, player_id, name, role) VALUES (?1, ?2, ?3, ?4)').bind(game.id, p.id, p.name, p.role),
      // In an UPDATE every column on the right-hand side still holds its old value.
      db
        .prepare(
          `INSERT INTO players (id, name, total, best, games, total_at, best_at) VALUES (?1, ?2, ?3, ?3, 1, ?4, ?4)
           ON CONFLICT (id) DO UPDATE SET
             name = excluded.name,
             total = total + excluded.total,
             games = games + 1,
             total_at = CASE WHEN excluded.total > 0 THEN excluded.total_at ELSE total_at END,
             best = MAX(best, excluded.best),
             best_at = CASE WHEN excluded.best > best THEN excluded.best_at ELSE best_at END`,
        )
        .bind(p.id, p.name, game.score, now),
    ]),
  ]);
  const places = new Map<string, { total: RankPosition; best: RankPosition }>();
  for (const p of players) {
    const total = await place(db, 'total', p.id);
    const best = await place(db, 'best', p.id);
    if (total && best) places.set(p.key, { total, best });
  }
  return places;
}

/** Both rankings (top rows), plus the rows of `me` (a fingerprint) when outside the top. */
export async function readRanking(db: D1Database, me: string | null): Promise<RankingResponse> {
  const [total, best] = await Promise.all([top(db, 'total', me), top(db, 'best', me)]);
  const response: RankingResponse = { total, best };
  if (me && (!total.some((r) => r.me) || !best.some((r) => r.me))) {
    const mine = await db.prepare('SELECT name, total, best, games FROM players WHERE id = ?1').bind(me).first<PlayerRow>();
    const t = await place(db, 'total', me);
    const b = await place(db, 'best', me);
    if (mine && t && b) {
      response.me = {
        total: { ...t, name: mine.name, games: mine.games, me: true },
        best: { ...b, name: mine.name, games: mine.games, me: true },
      };
    }
  }
  return response;
}

interface PlayerRow {
  id: string;
  name: string;
  total: number;
  best: number;
  games: number;
  total_at: number;
  best_at: number;
}

async function top(db: D1Database, board: Board, me: string | null): Promise<RankingRow[]> {
  const c = COLUMNS[board];
  const { results } = await db
    .prepare(`SELECT id, name, total, best, games, total_at, best_at FROM players WHERE games > 0 ORDER BY ${c.points} DESC, ${c.at} ASC, id ASC LIMIT ?1`)
    .bind(RANKING_SIZE)
    .all<PlayerRow>();
  // Same points reached at the same moment (players of the same game) share the place.
  const at = (r: PlayerRow) => (board === 'total' ? r.total_at : r.best_at);
  const rows: RankingRow[] = [];
  results.forEach((r, i) => {
    const prev = results[i - 1];
    const tied = prev && prev[board] === r[board] && at(prev) === at(r);
    rows.push({ rank: tied ? rows[i - 1].rank : i + 1, name: r.name, points: r[board], games: r.games, ...(r.id === me ? { me: true } : {}) });
  });
  return rows;
}

/** A player's place: 1 + those with more points, or the same points reached earlier (ties share the place). */
async function place(db: D1Database, board: Board, id: string): Promise<RankPosition | null> {
  const c = COLUMNS[board];
  const row = await db
    .prepare(
      `SELECT p.${c.points} AS points,
              (SELECT COUNT(*) FROM players o WHERE o.games > 0 AND (o.${c.points} > p.${c.points} OR (o.${c.points} = p.${c.points} AND o.${c.at} < p.${c.at}))) + 1 AS rank
       FROM players p WHERE p.id = ?1`,
    )
    .bind(id)
    .first<{ points: number; rank: number }>();
  return row ? { rank: row.rank, points: row.points } : null;
}
