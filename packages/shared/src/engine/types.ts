// Game state, actions and events of the rules engine. Everything here is plain
// JSON-serialisable data: relations use ids, never object references.

import type { Difficulty } from '../content/difficulty';
import type { EventCardId } from '../content/events';
import type { ItemId } from '../content/items';
import type { RoleId } from '../content/roles';
import type { RoomType, SystemId } from '../content/rooms';

export type Cell = [number, number];
export type Phase = 'crisis' | 'crew' | 'consequences';
export type GameStatus = 'playing' | 'won' | 'lost';
export type Condition = 'ok' | 'unconscious' | 'dead';
export type DoorType = 'normal' | 'key' | 'hack' | 'one_way' | 'jammed';
export type RepairTarget = SystemId | 'escape_pod';
export type CraftableItem = Extract<ItemId, 'medkit' | 'oxygen_tank'>;

export interface Player {
  id: string;
  name: string;
  role: RoleId;
  /** Controlled by the computer (the engine treats it like any other player). */
  bot: boolean;
  roomId: string;
  health: number;
  maxHealth: number;
  condition: Condition;
  roundsUnconscious: number;
  inventory: ItemId[];
  /** Bonus added to the next roll (cigarettes). */
  pendingBonus: number;
  escaped: boolean;
  /** Already ate and rested in the cantina (once per game). */
  rested: boolean;
}

export interface Room {
  id: string;
  type: RoomType;
  /** Module position in the ship grid (the westernmost module for wide rooms). */
  col: number;
  row: number;
  /** Modules it covers from `col` eastwards: 2 for the cantina, 1 for the rest. */
  span: number;
  /** One level down, reached by stairs: the only rooms that can flood. */
  lowerDeck: boolean;
  discovered: boolean;
  lit: boolean;
  flooded: boolean;
  fireRoundsLeft: number;
  /** Hidden items still to be found by searching (next one is the first). */
  items: ItemId[];
  /** The hacker scanned it: its type is known while still undiscovered. */
  scanned: boolean;
}

export interface Door {
  id: string;
  /** Adjacent floor cells on each side of the door (see ROOM_W/ROOM_D). */
  a: Cell;
  b: Cell;
  roomA: string;
  roomB: string;
  type: DoorType;
  open: boolean;
  /** one_way only: the room it can be opened from. */
  openableFrom: string | null;
}

export interface ShipSystem {
  id: SystemId;
  roomId: string;
  repairProgress: number;
  repairRequired: number;
  repaired: boolean;
}

export interface EscapePod {
  roomId: string;
  repairProgress: number;
  repairRequired: number;
  seats: number;
  launched: boolean;
}

export interface LogEntry {
  round: number;
  text: string;
}

export interface GameState {
  seed: string;
  difficulty: Difficulty;
  rngState: number;
  round: number;
  phase: Phase;
  status: GameStatus;
  /** Index into `players` of whoever is taking their turn (crew phase). */
  activePlayerIndex: number;
  actionsLeft: number;
  oxygen: number;
  /** Hull integrity: at 0 the ship gives way. */
  hull: number;
  cols: number;
  rows: number;
  players: Player[];
  rooms: Record<string, Room>;
  doors: Record<string, Door>;
  systems: Record<SystemId, ShipSystem>;
  escapePod: EscapePod;
  /** Successful crafts in the laboratory so far. */
  labCrafts: number;
  /** The whole ship surfaced (as opposed to only the pod getting away). */
  surfaced: boolean;
  eventDeck: EventCardId[];
  eventDiscard: EventCardId[];
  log: LogEntry[];
}

export type Action =
  | { type: 'MOVE'; playerId: string; toRoomId: string }
  | { type: 'OPEN_DOOR'; playerId: string; doorId: string }
  | { type: 'SEARCH'; playerId: string }
  | { type: 'REPAIR'; playerId: string; target: RepairTarget }
  | { type: 'HEAL'; playerId: string; targetId: string }
  | { type: 'REVIVE'; playerId: string; targetId: string }
  | { type: 'GIVE_ITEM'; playerId: string; targetId: string; item: ItemId }
  | { type: 'USE_ITEM'; playerId: string; item: ItemId }
  | { type: 'SCAN'; playerId: string; doorId: string }
  | { type: 'PUMP_OUT'; playerId: string }
  | { type: 'LAUNCH_POD'; playerId: string; passengers: string[] }
  | { type: 'SURFACE'; playerId: string }
  | { type: 'SHORE_UP'; playerId: string }
  /** Laboratory: make a medkit or an oxygen tank. */
  | { type: 'CRAFT'; playerId: string; item: CraftableItem }
  /** Cantina: eat and rest to get a life back. */
  | { type: 'REST'; playerId: string }
  /** After someone escaped, the crew may call it a day: a victory with whoever is saved. */
  | { type: 'END_GAME'; playerId: string }
  | { type: 'PASS'; playerId: string };

export interface DiceRoll {
  label: string;
  roll: number;
  bonuses: { label: string; value: number }[];
  total: number;
  difficulty: number;
  success: boolean;
}

export type GameEvent =
  | { type: 'ActionRejected'; reason: string }
  | { type: 'PlayerMoved'; playerId: string; from: string; to: string; doorId: string }
  | { type: 'DiceRolled'; playerId: string; dice: DiceRoll }
  | { type: 'DoorOpened'; doorId: string; byPlayerId: string | null }
  | { type: 'DoorFailed'; doorId: string }
  | { type: 'DoorClosed'; doorId: string }
  | { type: 'DoorJammed'; doorId: string }
  | { type: 'RoomRevealed'; roomId: string; fromDoorId: string | null }
  | { type: 'RoomScanned'; roomId: string }
  | { type: 'ItemFound'; playerId: string; item: ItemId | null }
  | { type: 'ItemGiven'; fromId: string; toId: string; item: ItemId }
  | { type: 'ItemUsed'; playerId: string; item: ItemId }
  | { type: 'ItemCrafted'; playerId: string; item: CraftableItem }
  | { type: 'RepairProgressed'; target: RepairTarget; progress: number; required: number }
  | { type: 'SystemRepaired'; target: RepairTarget }
  | { type: 'PlayerHealed'; playerId: string; amount: number }
  | { type: 'PlayerDamaged'; playerId: string; amount: number; cause: string }
  | { type: 'PlayerUnconscious'; playerId: string }
  | { type: 'PlayerRevived'; playerId: string }
  | { type: 'PlayerDied'; playerId: string }
  | { type: 'OxygenChanged'; from: number; to: number }
  | { type: 'HullChanged'; from: number; to: number }
  | { type: 'EventDrawn'; card: EventCardId; targetRoomId: string | null; targetDoorId: string | null }
  | { type: 'RoomFlooded'; roomId: string }
  | { type: 'RoomDrained'; roomId: string }
  | { type: 'RoomOnFire'; roomId: string }
  | { type: 'FireOut'; roomId: string }
  | { type: 'PhaseChanged'; phase: Phase; round: number }
  | { type: 'TurnChanged'; playerId: string }
  | { type: 'PlayerEscaped'; playerId: string; how: 'pod' | 'surface' }
  | { type: 'GameWon' }
  | { type: 'GameLost'; reason: string };

export interface ActionResult {
  state: GameState;
  events: GameEvent[];
}
