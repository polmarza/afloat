// Solvability checks for generated ships.

import type { Rng } from '../rng';
import type { Door, Room } from '../types';

/**
 * Rooms reachable from `start`, assuming every roll eventually succeeds.
 * Key doors only open with an access card; one-way doors only from their side
 * (once open they work both ways, but only if the open side was reached first).
 */
export function reachableRooms(rooms: Record<string, Room>, doors: Record<string, Door>, start: string, hasCard: boolean) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const d of Object.values(doors)) {
      const other = d.roomA === cur ? d.roomB : d.roomB === cur ? d.roomA : null;
      if (!other || seen.has(other) || !rooms[other]) continue;
      if (d.type === 'key' && !hasCard && !d.open) continue;
      if (d.type === 'one_way' && !d.open && d.openableFrom !== cur) continue;
      seen.add(other);
      queue.push(other);
    }
  }
  return seen;
}

/** Makes sure an access card can be found without crossing any key door. */
export function ensureAccessCard(rooms: Record<string, Room>, doors: Record<string, Door>, start: string, rng: Rng) {
  if (!Object.values(doors).some((d) => d.type === 'key')) return;
  const free = [...reachableRooms(rooms, doors, start, false)].map((id) => rooms[id]);
  if (free.some((r) => r.items.includes('access_card'))) return;

  // Move a card from an unreachable room (or create one) into a reachable room.
  const holder = Object.values(rooms).find((r) => r.items.includes('access_card'));
  if (holder) holder.items.splice(holder.items.indexOf('access_card'), 1);
  rng.pick(free).items.push('access_card');
}

/** At least one exit is reachable: the escape pod, or the bridge plus the power and pump rooms. */
export function isSolvable(rooms: Record<string, Room>, doors: Record<string, Door>, start: string) {
  const reach = new Set([...reachableRooms(rooms, doors, start, true)].map((id) => rooms[id].type));
  return reach.has('escape_pod') || (reach.has('bridge') && reach.has('engine') && reach.has('pumps'));
}
