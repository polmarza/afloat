// Hand-built states for rule tests: a straight line of rooms joined by doors.

import { BALANCE } from '../../src/config/balance';
import type { RoleId } from '../../src/content/roles';
import type { RoomType } from '../../src/content/rooms';
import { Rng } from '../../src/engine/rng';
import type { Door, DoorType, GameState, Player, Room } from '../../src/engine/types';

export interface FixtureOptions {
  /** Room types from west to east; room ids are r0, r1, … */
  rooms?: RoomType[];
  /** Door types between consecutive rooms (d0 joins r0–r1, …). */
  doors?: DoorType[];
  roles?: RoleId[];
}

export function makeState(opts: FixtureOptions = {}): GameState {
  const types = opts.rooms ?? ['quarters', 'engine', 'pumps', 'bridge', 'escape_pod', 'life_support'];
  const roles = opts.roles ?? ['engineer', 'medic'];
  const rooms: Record<string, Room> = {};
  types.forEach((type, i) => {
    rooms[`r${i}`] = {
      id: `r${i}`,
      type,
      col: i,
      row: 0,
      span: 1,
      lowerDeck: false,
      discovered: i === 0,
      lit: i === 0,
      flooded: false,
      fireRoundsLeft: 0,
      items: [],
      scanned: false,
    };
  });
  const doors: Record<string, Door> = {};
  for (let i = 0; i < types.length - 1; i++) {
    const type = opts.doors?.[i] ?? 'normal';
    doors[`d${i}`] = {
      id: `d${i}`,
      a: [i * 6 + 5, 2],
      b: [i * 6 + 6, 2],
      roomA: `r${i}`,
      roomB: `r${i + 1}`,
      type,
      open: false,
      openableFrom: type === 'one_way' ? `r${i + 1}` : null,
    };
  }
  const roomOf = (t: RoomType) => Object.values(rooms).find((r) => r.type === t)?.id ?? 'r0';
  const players: Player[] = roles.map((role, i) => ({
    id: `p${i + 1}`,
    name: `J${i + 1}`,
    role,
    bot: false,
    roomId: 'r0',
    health: role === 'soldier' ? 4 : 3,
    maxHealth: role === 'soldier' ? 4 : 3,
    condition: 'ok',
    roundsUnconscious: 0,
    inventory: [],
    pendingBonus: 0,
    escaped: false,
    rested: false,
  }));
  const system = (id: 'power' | 'life_support' | 'pumps', t: RoomType) => ({
    id,
    roomId: roomOf(t),
    repairProgress: 0,
    repairRequired: 2,
    repaired: false,
  });
  return {
    seed: 'test',
    difficulty: 'normal',
    rngState: 1,
    round: 1,
    phase: 'crew',
    status: 'playing',
    activePlayerIndex: 0,
    actionsLeft: BALANCE.actionsPerTurn,
    oxygen: 100,
    hull: BALANCE.hull.initial,
    cols: types.length,
    rows: 1,
    players,
    rooms,
    doors,
    systems: { power: system('power', 'engine'), life_support: system('life_support', 'life_support'), pumps: system('pumps', 'pumps') },
    escapePod: { roomId: roomOf('escape_pod'), repairProgress: 0, repairRequired: 2, seats: BALANCE.escapePod.seats, launched: false },
    labCrafts: 0,
    surfaced: false,
    eventDeck: ['calm', 'calm', 'calm'],
    eventDiscard: [],
    log: [],
  };
}

/** Sets the RNG so that the next d6 rolls `die`. */
export function nextRoll(state: GameState, die: number): GameState {
  for (let seed = 0; seed < 100000; seed++) {
    const holder = { rngState: seed };
    if (new Rng(holder).int(1, 6) === die) return { ...state, rngState: seed };
  }
  throw new Error('unreachable');
}
