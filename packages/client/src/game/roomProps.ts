// Furniture for each room type, in room-local cells (x 0–5, z 0–4; the
// cantina is two modules wide, x 0–11).
// Props are placed only where they keep every door reachable.

import { ROOM_D, ROOM_W } from '@afloat/shared/config/balance';
import type { RoomType } from '@afloat/shared/content/rooms';
import type { Room } from '@afloat/shared/engine/types';
import type { PropDef } from './props';

type Template = Omit<PropDef, 'x' | 'z'> & { x: number; z: number };

export type FloorKind = 'plate' | 'grate' | 'deck';

export const FLOOR_OF: Record<RoomType, FloorKind> = {
  quarters: 'plate',
  bridge: 'deck',
  engine: 'grate',
  life_support: 'grate',
  pumps: 'grate',
  escape_pod: 'plate',
  cantina: 'plate',
  greenhouse: 'grate',
  lab: 'deck',
  infirmary: 'deck',
  storage: 'plate',
  torpedo: 'grate',
  corridor: 'deck',
};

const TEMPLATES: Record<RoomType, Template[]> = {
  quarters: [
    { kind: 'bunk', x: 0, z: 0, w: 2 },
    { kind: 'bunk', x: 4, z: 0, w: 2 },
    { kind: 'beacon', x: 3, z: 0, wall: true },
    { kind: 'locker', x: 5, z: 3, rot: 1 },
    { kind: 'locker', x: 5, z: 4, rot: 1 },
    { kind: 'table', x: 4, z: 4 },
    { kind: 'crate', x: 0, z: 4 },
  ],
  bridge: [
    { kind: 'console', x: 1, z: 0 },
    { kind: 'console', x: 4, z: 0 },
    { kind: 'chair', x: 1, z: 1, rot: 2 },
    { kind: 'chair', x: 4, z: 1, rot: 2 },
    { kind: 'periscope', x: 2, z: 2 },
    { kind: 'sonar', x: 0, z: 4 },
    { kind: 'console', x: 5, z: 4, rot: 1 },
  ],
  engine: [
    { kind: 'reactor', x: 2, z: 2 },
    { kind: 'generator', x: 0, z: 0, w: 2 },
    { kind: 'generator', x: 4, z: 0, w: 2 },
    { kind: 'barrel', x: 0, z: 4, tint: 'rust' },
    { kind: 'barrel', x: 1, z: 4, tint: 'rust' },
    { kind: 'tank', x: 5, z: 4, tint: 'red' },
    { kind: 'tank', x: 4, z: 4, tint: 'yellow' },
    { kind: 'toolbench', x: 5, z: 2, rot: 1 },
  ],
  life_support: [
    { kind: 'generator', x: 0, z: 0, w: 2 },
    { kind: 'tank', x: 4, z: 0, tint: 'blue' },
    { kind: 'tank', x: 5, z: 0, tint: 'blue' },
    { kind: 'tank', x: 5, z: 1, tint: 'blue' },
    { kind: 'console', x: 5, z: 3, rot: 1 },
    { kind: 'barrel', x: 0, z: 4, tint: 'rust' },
  ],
  pumps: [
    { kind: 'generator', x: 0, z: 0, w: 2 },
    { kind: 'generator', x: 4, z: 4, w: 2, rot: 2 },
    { kind: 'tank', x: 5, z: 0, tint: 'blue' },
    { kind: 'barrel', x: 0, z: 4, tint: 'rust' },
    { kind: 'toolbench', x: 0, z: 2, rot: 3 },
  ],
  escape_pod: [
    { kind: 'pod', x: 2, z: 1, w: 2, d: 2 },
    { kind: 'console', x: 0, z: 0 },
    { kind: 'locker', x: 5, z: 0 },
    { kind: 'crate', x: 5, z: 4 },
  ],
  cantina: [
    { kind: 'counter', x: 4, z: 0, w: 3 },
    { kind: 'fridge', x: 7, z: 0 },
    { kind: 'fridge', x: 8, z: 0 },
    { kind: 'locker', x: 0, z: 0 },
    { kind: 'longtable', x: 1, z: 2, w: 3, d: 2 },
    { kind: 'longtable', x: 7, z: 2, w: 3, d: 2 },
    { kind: 'barrel', x: 11, z: 0, tint: 'rust' },
    { kind: 'crate', x: 11, z: 4 },
  ],
  greenhouse: [
    { kind: 'planter', x: 0, z: 0, w: 2 },
    { kind: 'planter', x: 4, z: 0, w: 2 },
    { kind: 'planter', x: 0, z: 2, w: 2 },
    { kind: 'planter', x: 4, z: 2, w: 2 },
    { kind: 'planter', x: 0, z: 4, w: 2 },
    { kind: 'tank', x: 5, z: 4, tint: 'blue' },
  ],
  lab: [
    { kind: 'labbench', x: 0, z: 0, w: 2 },
    { kind: 'labbench', x: 3, z: 0, w: 2 },
    { kind: 'centrifuge', x: 3, z: 4 },
    { kind: 'console', x: 0, z: 2, rot: 3 },
    { kind: 'locker', x: 5, z: 4, rot: 1 },
    { kind: 'tank', x: 0, z: 4, tint: 'yellow' },
  ],
  infirmary: [
    { kind: 'bunk', x: 0, z: 0, w: 2 },
    { kind: 'locker', x: 5, z: 0 },
    { kind: 'table', x: 5, z: 4 },
    { kind: 'crate', x: 0, z: 4 },
  ],
  storage: [
    { kind: 'crate', x: 0, z: 0 },
    { kind: 'crate', x: 1, z: 0 },
    { kind: 'crate', x: 5, z: 0 },
    { kind: 'crate', x: 5, z: 1 },
    { kind: 'crate', x: 0, z: 4 },
    { kind: 'barrel', x: 1, z: 4, tint: 'rust' },
    { kind: 'crate', x: 5, z: 4 },
  ],
  torpedo: [
    { kind: 'torpedo', x: 1, z: 0, w: 3 },
    { kind: 'crate', x: 5, z: 4 },
    { kind: 'crate', x: 0, z: 4 },
  ],
  corridor: [
    { kind: 'tank', x: 0, z: 0, tint: 'yellow' },
    { kind: 'crate', x: 5, z: 4 },
  ],
};

const footprint = (p: PropDef): [number, number][] => {
  if (p.wall) return [];
  const cells: [number, number][] = [];
  for (let x = p.x; x < p.x + (p.w ?? 1); x++) for (let z = p.z; z < p.z + (p.d ?? 1); z++) cells.push([x, z]);
  return cells;
};

/**
 * Props for a room in world cells. Mirrors the template on odd rooms for variety,
 * and drops any prop that would sit on a door cell or cut a door off.
 */
export function propsForRoom(room: Room, doorCells: [number, number][]): PropDef[] {
  const ox = room.col * ROOM_W;
  const oz = room.row * ROOM_D;
  const width = ROOM_W * room.span;
  const mirror = (room.col + room.row) % 2 === 1;
  const key = (x: number, z: number) => `${x},${z}`;
  const doors = new Set(doorCells.map(([x, z]) => key(x, z)));
  const blocked = new Set<string>();
  const placed: PropDef[] = [];

  for (const t of TEMPLATES[room.type]) {
    const w = t.w ?? 1;
    const localX = mirror ? width - t.x - w : t.x;
    const rot = mirror && (t.rot === 1 || t.rot === 3) ? ((t.rot + 2) % 4 as 1 | 3) : t.rot;
    const prop: PropDef = { ...t, x: ox + localX, z: oz + t.z, rot };
    const cells = footprint(prop);
    if (cells.some(([x, z]) => doors.has(key(x, z)) || blocked.has(key(x, z)))) continue;
    for (const [x, z] of cells) blocked.add(key(x, z));
    if (!allDoorsConnected(ox, oz, width, blocked, doorCells)) {
      for (const [x, z] of cells) blocked.delete(key(x, z));
      continue;
    }
    placed.push(prop);
  }
  return placed;
}

/** Every door cell of the room can reach every other one, and most of the floor stays walkable. */
function allDoorsConnected(ox: number, oz: number, width: number, blocked: Set<string>, doorCells: [number, number][]) {
  const key = (x: number, z: number) => `${x},${z}`;
  const inside = (x: number, z: number) => x >= ox && x < ox + width && z >= oz && z < oz + ROOM_D;
  const free: [number, number][] = [];
  for (let x = ox; x < ox + width; x++) for (let z = oz; z < oz + ROOM_D; z++) if (!blocked.has(key(x, z))) free.push([x, z]);
  if (!free.length) return false;
  const start = doorCells[0] ?? free[0];
  const seen = new Set([key(...start)]);
  const queue = [start];
  while (queue.length) {
    const [x, z] = queue.shift()!;
    for (const [nx, nz] of [
      [x + 1, z],
      [x - 1, z],
      [x, z + 1],
      [x, z - 1],
    ] as [number, number][]) {
      const k = key(nx, nz);
      if (!inside(nx, nz) || blocked.has(k) || seen.has(k)) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  return free.every(([x, z]) => seen.has(key(x, z)));
}
