// Working context for one applyAction call: a private copy of the state, the
// seeded RNG bound to it, and the list of events produced along the way.

import { ITEMS, type ItemId } from '../content/items';
import { ROLES } from '../content/roles';
import { ROOM_NAMES } from '../content/rooms';
import { Rng } from './rng';
import type { Door, GameEvent, GameState, Player, Room } from './types';

export class Ctx {
  readonly rng: Rng;
  readonly events: GameEvent[] = [];

  constructor(readonly s: GameState) {
    this.rng = new Rng(s);
  }

  emit(event: GameEvent) {
    this.events.push(event);
  }

  log(text: string) {
    this.s.log.push({ round: this.s.round, text });
  }

  player(id: string) {
    const p = this.s.players.find((p) => p.id === id);
    if (!p) throw new Error(`Unknown player ${id}`);
    return p;
  }

  room(id: string) {
    return this.s.rooms[id];
  }

  roomOf(p: Player) {
    return this.s.rooms[p.roomId];
  }

  roomName(room: Room | string) {
    const r = typeof room === 'string' ? this.s.rooms[room] : room;
    return ROOM_NAMES[r.type];
  }

  /** The room on the other side of a door from `roomId`, or null if the door doesn't touch it. */
  otherSide(door: Door, roomId: string) {
    return door.roomA === roomId ? door.roomB : door.roomB === roomId ? door.roomA : null;
  }

  doorBetween(r1: string, r2: string) {
    return Object.values(this.s.doors).find((d) => (d.roomA === r1 && d.roomB === r2) || (d.roomA === r2 && d.roomB === r1));
  }

  /** Alive crew still on board (conscious or not). */
  aboard() {
    return this.s.players.filter((p) => !p.escaped && p.condition !== 'dead');
  }

  /** Crew who can still take turns. */
  active() {
    return this.s.players.filter((p) => !p.escaped && p.condition === 'ok');
  }

  has(p: Player, item: ItemId) {
    return p.inventory.includes(item);
  }

  removeItem(p: Player, item: ItemId) {
    p.inventory.splice(p.inventory.indexOf(item), 1);
  }

  label(p: Player) {
    return `${p.name} (${ROLES[p.role].name.toLowerCase()})`;
  }

  itemName(item: ItemId) {
    return ITEMS[item].name;
  }
}

/** Thrown by a rule to reject an action without changing anything. */
export class Rejected extends Error {}

export function reject(reason: string): never {
  throw new Rejected(reason);
}
