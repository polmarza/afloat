// Creating a new game: generate the ship, place the crew, start round 1.

import { BALANCE } from '../config/balance';
import type { Difficulty } from '../content/difficulty';
import { EVENT_DECK, type EventCardId } from '../content/events';
import type { RoleId } from '../content/roles';
import { SYSTEM_ROOM, type SystemId } from '../content/rooms';
import { Ctx } from './context';
import { generateMap } from './mapgen/generate';
import { runCrisis } from './phases';
import type { ActionResult, GameState, Player, ShipSystem } from './types';

export interface NewGame {
  seed: string;
  /** Ship size level (default normal). */
  difficulty?: Difficulty;
  players: { name: string; role: RoleId; bot?: boolean }[];
}

export function createGame(config: NewGame): ActionResult {
  const n = config.players.length;
  if (n < BALANCE.crew.min || n > BALANCE.crew.max) throw new Error(`Se necesitan entre ${BALANCE.crew.min} y ${BALANCE.crew.max} jugadores.`);
  if (new Set(config.players.map((p) => p.role)).size !== n) throw new Error('Cada jugador debe tener un rol distinto.');

  const difficulty = config.difficulty ?? 'normal';
  const map = generateMap(config.seed, n, difficulty);
  const roomOfType = (type: string) => Object.values(map.rooms).find((r) => r.type === type)!.id;
  const quarters = roomOfType('quarters');

  const players: Player[] = config.players.map((p, i) => {
    const maxHealth = p.role === 'soldier' ? BALANCE.health.soldier : BALANCE.health.default;
    return {
      id: `p${i + 1}`,
      name: p.name,
      role: p.role,
      bot: !!p.bot,
      roomId: quarters,
      health: maxHealth,
      maxHealth,
      condition: 'ok',
      roundsUnconscious: 0,
      inventory: [],
      pendingBonus: 0,
      escaped: false,
      rested: false,
    };
  });

  const system = (id: SystemId): ShipSystem => ({
    id,
    roomId: roomOfType(SYSTEM_ROOM[id]),
    repairProgress: 0,
    repairRequired: BALANCE.repairRequired[id],
    repaired: false,
  });

  const state: GameState = {
    seed: config.seed,
    difficulty,
    rngState: map.rngState,
    round: 1,
    phase: 'crisis',
    status: 'playing',
    activePlayerIndex: 0,
    actionsLeft: 0,
    oxygen: BALANCE.oxygen.initial,
    hull: BALANCE.hull.initial,
    cols: map.cols,
    rows: map.rows,
    players,
    rooms: map.rooms,
    doors: map.doors,
    systems: { power: system('power'), life_support: system('life_support'), pumps: system('pumps') },
    escapePod: {
      roomId: roomOfType('escape_pod'),
      repairProgress: 0,
      repairRequired: BALANCE.repairRequired.escape_pod,
      seats: BALANCE.escapePod.seats,
      launched: false,
    },
    labCrafts: 0,
    surfaced: false,
    eventDeck: [],
    eventDiscard: [],
    log: [],
  };

  const ctx = new Ctx(state);
  state.eventDeck = ctx.rng.shuffle(EVENT_DECK.flatMap(([card, k]) => Array<EventCardId>(k).fill(card)));
  ctx.log('La alarma os despierta en los camarotes. Solo hay luz de emergencia.');
  runCrisis(ctx);
  return { state, events: ctx.events };
}
