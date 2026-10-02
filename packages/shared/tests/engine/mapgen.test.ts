import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { DIFFICULTY_ORDER } from '../../src/content/difficulty';
import { MANDATORY_ROOMS, UNIQUE_ROOMS, WIDE_ROOM } from '../../src/content/rooms';
import { ROOM_D, ROOM_W } from '../../src/config/balance';
import type { Room } from '../../src/engine/types';

/** Whether a floor cell lies inside a room. */
const inside = (r: Room, [x, z]: [number, number]) =>
  x >= r.col * ROOM_W && x < (r.col + r.span) * ROOM_W && z >= r.row * ROOM_D && z < (r.row + 1) * ROOM_D;
import { generateMap } from '../../src/engine/mapgen/generate';
import { isSolvable, reachableRooms } from '../../src/engine/mapgen/validate';

describe('map generation', () => {
  it('is deterministic for a seed', () => {
    expect(generateMap('ABISMO42', 3)).toEqual(generateMap('ABISMO42', 3));
    expect(generateMap('ABISMO42', 3)).not.toEqual(generateMap('ABISMO43', 3));
  });

  it('sizes the grid by player count, every module covered by exactly one room', () => {
    for (const [d, n] of DIFFICULTY_ORDER.flatMap((d) => [2, 3, 4, 5].map((n) => [d, n] as const))) {
      const map = generateMap('size', n, d);
      const [cols, rows] = BALANCE.map.gridByLevel[d][n];
      expect([map.cols, map.rows]).toEqual([cols, rows]);
      const covered = Object.values(map.rooms).flatMap((r) => Array.from({ length: r.span }, (_, i) => `${r.col + i},${r.row}`));
      expect(covered).toHaveLength(cols * rows);
      expect(new Set(covered).size).toBe(cols * rows);
    }
  });

  it('every level has at least 8 modules, and harder levels are never smaller', () => {
    for (const n of [2, 3, 4, 5]) {
      const sizes = DIFFICULTY_ORDER.map((d) => BALANCE.map.gridByLevel[d][n].reduce((a, b) => a * b));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(8);
      expect(sizes).toEqual([...sizes].sort((a, b) => a - b));
    }
  });

  it('the cantina is the only wide room and every special room appears at most once', () => {
    let cantinas = 0;
    for (let i = 0; i < 400; i++) {
      const rooms = Object.values(generateMap(`wide-${i}`, 2 + (i % 4)).rooms);
      for (const r of rooms) expect(r.span).toBe(r.type === WIDE_ROOM ? 2 : 1);
      for (const t of [WIDE_ROOM, ...UNIQUE_ROOMS]) expect(rooms.filter((r) => r.type === t).length).toBeLessThanOrEqual(1);
      if (rooms.some((r) => r.type === WIDE_ROOM)) cantinas++;
    }
    expect(cantinas).toBeGreaterThan(100);
  });

  it('produces valid, solvable ships for thousands of seeds', () => {
    for (let i = 0; i < 2000; i++) {
      const players = 2 + (i % 4);
      const map = generateMap(`seed-${i}`, players);
      const rooms = Object.values(map.rooms);
      const quarters = rooms.find((r) => r.type === 'quarters')!;

      for (const t of MANDATORY_ROOMS) expect(rooms.filter((r) => r.type === t)).toHaveLength(1);
      expect(quarters.lowerDeck).toBe(false);
      expect(quarters.flooded).toBe(false);
      expect(quarters.items.length).toBeGreaterThanOrEqual(1);
      expect(rooms.filter((r) => r.flooded).every((r) => r.lowerDeck)).toBe(true);
      expect(isSolvable(map.rooms, map.doors, quarters.id)).toBe(true);

      // An access card can always be found before any key door.
      if (Object.values(map.doors).some((d) => d.type === 'key')) {
        const free = reachableRooms(map.rooms, map.doors, quarters.id, false);
        expect([...free].some((id) => map.rooms[id].items.includes('access_card'))).toBe(true);
      }

      // Doors join neighbouring rooms through their shared wall.
      for (const d of Object.values(map.doors)) {
        expect(d.roomA).not.toBe(d.roomB);
        expect(inside(map.rooms[d.roomA], d.a)).toBe(true);
        expect(inside(map.rooms[d.roomB], d.b)).toBe(true);
        expect(Math.abs(d.a[0] - d.b[0]) + Math.abs(d.a[1] - d.b[1])).toBe(1);
      }
    }
  });

  it('never places the escape pod next to the quarters', () => {
    for (let i = 0; i < 300; i++) {
      const rooms = Object.values(generateMap(`pod-${i}`, 3).rooms);
      const q = rooms.find((r) => r.type === 'quarters')!;
      const pod = rooms.find((r) => r.type === 'escape_pod')!;
      expect(Math.abs(q.col - pod.col) + Math.abs(q.row - pod.row)).toBeGreaterThan(1);
    }
  });
});
