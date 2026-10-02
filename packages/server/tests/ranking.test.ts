import { describe, expect, it } from 'vitest';
import { fingerprint, readRanking, recordGame } from '../src/ranking';
import type { RankedGame } from '../src/room';
import { testDb } from './d1';

let n = 0;
function game(score: number, players: [key: string, name: string][]): RankedGame {
  n++;
  return {
    id: `TEST-${n}`,
    room: 'TESTS',
    difficulty: 'normal',
    status: 'won',
    score,
    rounds: 5,
    setup: { seed: 'S', players: [] },
    actions: [],
    players: players.map(([key, name], i) => ({ key, name, role: (['engineer', 'medic', 'soldier'] as const)[i] })),
  };
}

describe('online ranking', () => {
  it('gives every player the shared score, adds it up and keeps the best game', async () => {
    const db = testDb();
    await recordGame(db, game(300, [['ana', 'Ana'], ['luis', 'Luis']]), 1000);
    await recordGame(db, game(200, [['ana', 'Ana']]), 2000);
    const r = await readRanking(db, null);
    expect(r.total.map((x) => [x.name, x.points, x.games])).toEqual([
      ['Ana', 500, 2],
      ['Luis', 300, 1],
    ]);
    expect(r.best.map((x) => [x.name, x.points])).toEqual([
      ['Ana', 300],
      ['Luis', 300],
    ]);
  });

  it('lets players of the same game share their place, and ranks earlier ties first', async () => {
    const db = testDb();
    await recordGame(db, game(100, [['eva', 'Eva']]), 500);
    await recordGame(db, game(100, [['ana', 'Ana'], ['luis', 'Luis']]), 1000);
    const r = await readRanking(db, null);
    expect(r.total.map((x) => [x.name, x.rank])).toEqual([
      ['Eva', 1],
      ['Ana', 2],
      ['Luis', 2],
    ]);
  });

  it('tells each player their new places', async () => {
    const db = testDb();
    await recordGame(db, game(400, [['eva', 'Eva']]), 500);
    const places = await recordGame(db, game(250, [['ana', 'Ana'], ['luis', 'Luis']]), 1000);
    expect(places.get('ana')).toEqual({ total: { rank: 2, points: 250 }, best: { rank: 2, points: 250 } });
  });

  it('shows the last name used, in one row per browser', async () => {
    const db = testDb();
    await recordGame(db, game(100, [['ana', 'Ana']]), 1000);
    await recordGame(db, game(50, [['ana', 'Anita']]), 2000);
    const r = await readRanking(db, null);
    expect(r.total).toHaveLength(1);
    expect(r.total[0]).toMatchObject({ name: 'Anita', points: 150 });
  });

  it('marks your row, and gives your places when you are outside the top', async () => {
    const db = testDb();
    for (let i = 0; i < 25; i++) await recordGame(db, game(1000 - i, [[`p${i}`, `P${i}`]]), i);
    await recordGame(db, game(10, [['ana', 'Ana']]), 100);
    const me = await fingerprint('ana');
    const r = await readRanking(db, me);
    expect(r.total).toHaveLength(20);
    expect(r.total.some((x) => x.me)).toBe(false);
    expect(r.me?.total).toMatchObject({ rank: 26, name: 'Ana', points: 10, me: true });

    const top = await readRanking(db, await fingerprint('p0'));
    expect(top.total[0].me).toBe(true);
    expect(top.me).toBeUndefined();
  });

  it('never stores the browser key itself', async () => {
    const db = testDb();
    await recordGame(db, game(100, [['secret-key', 'Ana']]), 1000);
    const row = await db.prepare('SELECT id FROM players').first<{ id: string }>();
    expect(row!.id).toBe(await fingerprint('secret-key'));
    expect(row!.id).not.toContain('secret');
  });
});
