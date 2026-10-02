// Every number that tunes the rules lives here. Adjust after playtesting;
// nothing in src/engine should hard-code a rule value.

import type { Difficulty } from '../content/difficulty';

export const BALANCE = {
  actionsPerTurn: 3,
  /** The first round starts calm: no event card is drawn before this round. */
  firstEventRound: 2,
  oxygen: {
    initial: 120,
    /** Leak of the damaged hull; 0 once life support is repaired. */
    baseConsumption: 4,
    perCrewMember: 2,
    diverMultiplier: 0.5,
    oxygenTankRestore: 15,
    cigarettesCost: 3,
    scrubberFailureLoss: 10,
  },
  health: { default: 3, soldier: 4, roundsUnconsciousBeforeDeath: 2 },
  hull: {
    /** Hull integrity at the start; at 0 the hull gives way. */
    initial: 20,
    /** Lost every round to the pressure. */
    perRound: 1,
    /** Extra damage from each event card. */
    eventDamage: { flood: 3, collapse: 2, fire: 1, short_circuit: 0, scrubber_failure: 0, calm: 0 },
    /** Integrity recovered by a successful "shore up" (same roll as repairing). */
    shoreUpGain: 2,
    /** Shoring up is only possible once the hull is this damaged or worse. */
    shoreUpBelow: 15,
  },
  dice: { sides: 6, autoFailOn: 1 },
  difficulty: { hack: 5, force: 5, repair: 4, craft: 4 },
  roleBonus: { engineerRepair: 2, soldierForce: 2, hackerHack: 2, medicHealAmount: 2 },
  itemBonus: { wrench: 1, crowbar: 2, laptop: 1, cigarettes: 1 },
  heal: { bandage: 1, medkit: 2 },
  movement: { floodedCost: 2, diverFloodedCost: 1 },
  repairRequired: { power: 2, life_support: 2, pumps: 2, escape_pod: 2 },
  /** The capsule always saves one person, whatever the crew size. */
  escapePod: { seats: 1 },
  fire: { durationRounds: 2, damage: 1 },
  flood: { damage: 1 },
  collapse: { damageOnRollAtMost: 2, damage: 1 },
  rooms: {
    /** Oxygen made by the greenhouse every round, once discovered and with power. */
    greenhouseOxygen: 3,
    /** Laboratory: actions it costs and successful crafts the materials allow. */
    craft: { cost: 2, maxPerGame: 2 },
    /** Lives recovered by eating and resting in the cantina (once per crew member). */
    restHeal: 1,
  },
  /** Final score: points per thing (negative = penalty). Never below 0. */
  score: { perSaved: 100, surfaceBonus: 100, perOxygen: 2, perHull: 5, perSystem: 20, perDead: -50, perRound: -5, multiplier: { easy: 1, normal: 1.25, hard: 1.5 } as Record<Difficulty, number> },
  map: {
    /** Modules (columns × rows) of the ship grid. Every room is one module except the cantina (two). */
    gridByLevel: {
      easy: { 2: [4, 2], 3: [5, 2], 4: [5, 2], 5: [5, 3] },
      normal: { 2: [5, 2], 3: [5, 3], 4: [6, 3], 5: [6, 3] },
      hard: { 2: [5, 3], 3: [6, 3], 4: [7, 3], 5: [7, 3] },
    } as Record<Difficulty, Record<number, [number, number]>>,
    /** Chance that the ship has a cantina (when there are at least two spare modules). */
    cantinaChance: 0.6,
    /** Min and max hidden items per room (quarters always get at least 1). */
    itemsPerRoom: [0, 2] as [number, number],
    /** Share of rooms (never the quarters) on the lower deck: the only ones that can flood. */
    lowerDeckRatio: 0.3,
    /** Lower-deck rooms that start flooded. */
    initialFlooded: 1,
    /** Chance of adding a door on a module edge that the spanning tree didn't use. */
    extraDoorChance: 0.35,
    doorTypeWeights: { normal: 40, key: 15, hack: 20, one_way: 10, jammed: 15 },
    /** Map generation retries before giving up on a seed. */
    maxAttempts: 50,
  },
} as const;

/** Size of a room module in cells (the client draws one floor tile per cell). */
export const ROOM_W = 6;
export const ROOM_D = 5;
