// Procedural submarine: a grid of equal room modules joined by doors. Every
// room is one module, except the cantina, which takes two side by side.

import { BALANCE, ROOM_D, ROOM_W } from '../../config/balance';
import type { Difficulty } from '../../content/difficulty';
import { ITEM_DECK, type ItemId } from '../../content/items';
import { FILLER_ROOMS, MANDATORY_ROOMS, UNIQUE_ROOMS, WIDE_ROOM, type RoomType } from '../../content/rooms';
import { hashSeed, Rng } from '../rng';
import type { Door, DoorType, Room } from '../types';
import { ensureAccessCard, isSolvable } from './validate';

export interface ShipMap {
  cols: number;
  rows: number;
  rooms: Record<string, Room>;
  doors: Record<string, Door>;
  /** RNG state after generation, to continue the game's random sequence. */
  rngState: number;
}

export const roomId = (col: number, row: number) => `room-${col}-${row}`;

/** Generates a solvable ship for a seed. Tries derived sub-seeds until one validates. */
export function generateMap(seed: string, playerCount: number, difficulty: Difficulty = 'normal'): ShipMap {
  for (let attempt = 0; attempt < BALANCE.map.maxAttempts; attempt++) {
    const holder = { rngState: hashSeed(`${seed}#${attempt}`) };
    const map = attemptMap(new Rng(holder), playerCount, difficulty);
    if (map) return { ...map, rngState: holder.rngState };
  }
  throw new Error(`No solvable map for seed "${seed}" after ${BALANCE.map.maxAttempts} attempts`);
}

function attemptMap(rng: Rng, playerCount: number, difficulty: Difficulty): Omit<ShipMap, 'rngState'> | null {
  const [cols, rows] = BALANCE.map.gridByLevel[difficulty][playerCount] ?? BALANCE.map.gridByLevel[difficulty][2];
  const modules: [number, number][] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) modules.push([c, r]);

  // The cantina (if any) takes two modules side by side.
  const wide = modules.length - MANDATORY_ROOMS.length >= 2 && rng.chance(BALANCE.map.cantinaChance);
  const singles = wide ? modules.length - 2 : modules.length;

  // Room types: every mandatory room once, then special rooms (once each) and fillers.
  const types: RoomType[] = [...MANDATORY_ROOMS];
  const pool: RoomType[] = [...UNIQUE_ROOMS, ...FILLER_ROOMS];
  while (types.length < singles) {
    const t = rng.pick(pool);
    if (UNIQUE_ROOMS.includes(t)) pool.splice(pool.indexOf(t), 1);
    types.push(t);
  }
  rng.shuffle(types);

  const rooms: Record<string, Room> = {};
  /** Room covering each module. */
  const moduleRoom = new Map<string, string>();
  const addRoom = (type: RoomType, col: number, row: number, span: number) => {
    const id = roomId(col, row);
    rooms[id] = {
      id,
      type,
      col,
      row,
      span,
      lowerDeck: false,
      discovered: false,
      lit: false,
      flooded: false,
      fireRoundsLeft: 0,
      items: [],
      scanned: false,
    };
    for (let c = col; c < col + span; c++) moduleRoom.set(moduleKey(c, row), id);
  };
  if (wide) {
    const [col, row] = rng.pick(modules.filter(([c]) => c + 1 < cols));
    addRoom(WIDE_ROOM, col, row, 2);
  }
  let next = 0;
  for (const [col, row] of modules) if (!moduleRoom.has(moduleKey(col, row))) addRoom(types[next++], col, row, 1);

  const byType = (t: RoomType) => Object.values(rooms).find((r) => r.type === t)!;
  const quarters = byType('quarters');
  const pod = byType('escape_pod');
  if (Math.abs(quarters.col - pod.col) + Math.abs(quarters.row - pod.row) <= 1) return null;
  quarters.discovered = quarters.lit = true;

  // Lower deck (never the quarters) and the rooms that start flooded.
  const others = rng.shuffle(Object.values(rooms).filter((r) => r !== quarters));
  const lowerCount = Math.max(BALANCE.map.initialFlooded, Math.round(Object.keys(rooms).length * BALANCE.map.lowerDeckRatio));
  const lower = others.slice(0, lowerCount);
  for (const r of lower) r.lowerDeck = true;
  for (const r of lower.slice(0, BALANCE.map.initialFlooded)) r.flooded = true;

  const doors = buildDoors(rng, cols, rows, moduleRoom);
  distributeItems(rng, rooms, quarters.id);
  ensureAccessCard(rooms, doors, quarters.id, rng);
  if (!isSolvable(rooms, doors, quarters.id)) return null;
  return { cols, rows, rooms, doors };
}

const moduleKey = (col: number, row: number) => `${col},${row}`;

/** Random spanning tree over the rooms plus a few extra doors for loops. */
function buildDoors(rng: Rng, cols: number, rows: number, moduleRoom: Map<string, string>) {
  const edges: [[number, number], [number, number]][] = [];
  const roomAt = (c: number, r: number) => moduleRoom.get(moduleKey(c, r))!;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Both halves of the cantina are one room: no wall, no door between them.
      if (c + 1 < cols && roomAt(c, r) !== roomAt(c + 1, r)) edges.push([[c, r], [c + 1, r]]);
      if (r + 1 < rows) edges.push([[c, r], [c, r + 1]]);
    }
  }
  rng.shuffle(edges);

  // Kruskal with union-find: tree edges first, the rest become optional extras.
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    while (parent.has(k) && parent.get(k) !== k) k = parent.get(k)!;
    return k;
  };
  const chosen: typeof edges = [];
  for (const e of edges) {
    const [ka, kb] = [find(roomAt(...e[0])), find(roomAt(...e[1]))];
    if (ka !== kb) {
      parent.set(ka, kb);
      parent.set(kb, kb);
      chosen.push(e);
    } else if (rng.chance(BALANCE.map.extraDoorChance)) {
      chosen.push(e);
    }
  }

  const doors: Record<string, Door> = {};
  for (const [[c1, r1], [c2, r2]] of chosen) {
    const roomA = roomAt(c1, r1);
    const roomB = roomAt(c2, r2);
    const id = `door-${roomA}-${roomB}`;
    // A wide room may touch the same neighbour along two module edges: one door is enough.
    if (doors[id]) continue;
    let a: [number, number];
    let b: [number, number];
    if (c2 !== c1) {
      // East–west: the door sits on the vertical wall between the two modules.
      const z = r1 * ROOM_D + rng.int(1, ROOM_D - 2);
      a = [c2 * ROOM_W - 1, z];
      b = [c2 * ROOM_W, z];
    } else {
      const x = c1 * ROOM_W + rng.int(1, ROOM_W - 2);
      a = [x, r2 * ROOM_D - 1];
      b = [x, r2 * ROOM_D];
    }
    const type = rng.weighted(BALANCE.map.doorTypeWeights) as DoorType;
    doors[id] = {
      id,
      a,
      b,
      roomA,
      roomB,
      type,
      open: false,
      openableFrom: type === 'one_way' ? rng.pick([roomA, roomB]) : null,
    };
  }
  return doors;
}

/** Shuffles the item deck and hides a few items in every room (the quarters get at least one). */
function distributeItems(rng: Rng, rooms: Record<string, Room>, quartersId: string) {
  const deck: ItemId[] = rng.shuffle(ITEM_DECK.flatMap(([item, n]) => Array<ItemId>(n).fill(item)));
  const [min, max] = BALANCE.map.itemsPerRoom;
  // Quarters first so the deck can't run out before them.
  const order = [rooms[quartersId], ...rng.shuffle(Object.values(rooms).filter((r) => r.id !== quartersId))];
  for (const room of order) {
    const count = Math.max(room.id === quartersId ? 1 : 0, rng.int(min, max));
    for (let i = 0; i < count && deck.length; i++) room.items.push(deck.pop()!);
  }
}
