// Computer-controlled crew: a priority-based ("classic") AI. It only picks
// actions, exactly like a human would; the engine validates them.
//
// The bot plays fair: it only uses what a player could see (discovered or
// scanned rooms, doors, its own inventory) plus its own memory of rooms it has
// already searched empty.

import type { ItemId } from '../content/items';
import type { RoleId } from '../content/roles';
import { applyAction, moveCost, oxygenConsumption, type Action, type CraftableItem, type GameEvent, type GameState, type Player } from '../engine';

export interface BotMemory {
  /** Rooms where a search came back empty. */
  searchedEmpty: Set<string>;
}

export const createBotMemory = (): BotMemory => ({ searchedEmpty: new Set() });

/** Updates the bots' shared memory from what just happened. */
export function observe(memory: BotMemory, before: GameState, events: GameEvent[]) {
  for (const e of events) {
    if (e.type === 'ItemFound' && !e.item) {
      const p = before.players.find((pl) => pl.id === e.playerId);
      if (p) memory.searchedEmpty.add(p.roomId);
    }
  }
}

/** Items worth handing to a crew member of a given role. */
const BEST_HOLDER: Partial<Record<ItemId, RoleId>> = { wrench: 'engineer', crowbar: 'soldier', laptop: 'hacker' };

/** Picks the next action for the active (bot) player. */
export function decide(s: GameState, memory: BotMemory): Action {
  const p = s.players[s.activePlayerIndex];
  const id = p.id;
  const legal = (a: Action) => applyAction(s, a).events[0]?.type !== 'ActionRejected';
  const first = (...candidates: (Action | null | false | undefined)[]) => candidates.find((a): a is Action => !!a && legal(a));

  const room = s.rooms[p.roomId];
  const here = s.players.filter((o) => o.roomId === p.roomId && !o.escaped && o.condition !== 'dead');
  const conscious = s.players.filter((o) => !o.escaped && o.condition === 'ok');
  const roundsOfAir = s.oxygen / Math.max(1, oxygenConsumption(s));
  const pod = s.escapePod;
  const podReady = !pod.launched && pod.repairProgress >= pod.repairRequired;
  const canSurface = s.systems.power.repaired && s.systems.pumps.repaired;

  // 1. Get out.
  if (room.type === 'bridge' && canSurface) return { type: 'SURFACE', playerId: id };
  if (podReady && pod.roomId === p.roomId) {
    const aboard = here.filter((o) => o.condition === 'ok');
    const everyoneHere = aboard.length >= Math.min(pod.seats, conscious.length);
    if (everyoneHere || roundsOfAir < 2 || s.hull <= 4) {
      // Humans board first, then bots.
      const passengers = [...aboard].sort((a, b) => Number(a.bot) - Number(b.bot)).slice(0, pod.seats).map((o) => o.id);
      const launch = first({ type: 'LAUNCH_POD', playerId: id, passengers });
      if (launch) return launch;
    }
  }

  // 2. Look after the crew.
  const revive = first(...here.filter((o) => o.condition === 'unconscious').map((o): Action => ({ type: 'REVIVE', playerId: id, targetId: o.id })));
  if (revive) return revive;
  const hurt = here
    .filter((o) => o.condition === 'ok' && (o.health <= 1 || o.maxHealth - o.health >= 2))
    .sort((a, b) => a.health - b.health);
  const heal = first(...hurt.map((o): Action => ({ type: 'HEAL', playerId: id, targetId: o.id })));
  if (heal) return heal;
  if (room.type === 'cantina' && !p.rested && p.health < p.maxHealth) {
    const rest = first({ type: 'REST', playerId: id });
    if (rest) return rest;
  }

  // 3. Fix what is in this room.
  const repair = first(
    !s.systems.power.repaired && s.systems.power.roomId === p.roomId && { type: 'REPAIR', playerId: id, target: 'power' },
    !s.systems.pumps.repaired && s.systems.pumps.roomId === p.roomId && { type: 'REPAIR', playerId: id, target: 'pumps' },
    !s.systems.life_support.repaired && s.systems.life_support.roomId === p.roomId && { type: 'REPAIR', playerId: id, target: 'life_support' },
    pod.roomId === p.roomId && !podReady && !pod.launched && { type: 'REPAIR', playerId: id, target: 'escape_pod' },
  );
  if (repair) return repair;
  const upkeep = first(
    room.flooded && s.systems.pumps.repaired && { type: 'PUMP_OUT', playerId: id },
    (s.hull <= 5 || (s.hull <= 8 && p.role === 'engineer')) && { type: 'SHORE_UP', playerId: id },
    roundsOfAir < 3 && p.inventory.includes('oxygen_tank') && { type: 'USE_ITEM', playerId: id, item: 'oxygen_tank' },
  );
  if (upkeep) return upkeep;
  if (room.type === 'lab') {
    // Air first when it is running short or there is no medic aboard to spare medkits.
    const medic = conscious.some((o) => o.role === 'medic');
    const order: CraftableItem[] = roundsOfAir < 6 || medic ? ['oxygen_tank', 'medkit'] : ['medkit', 'oxygen_tank'];
    const make = first({ type: 'CRAFT', playerId: id, item: order[0] });
    if (make) return make;
  }

  // 4. Hand tools to whoever makes the most of them.
  for (const item of new Set(p.inventory)) {
    const role = BEST_HOLDER[item];
    if (!role || p.role === role) continue;
    const mate = here.find((o) => o.role === role && o.condition === 'ok' && !o.inventory.includes(item));
    const give = mate && first({ type: 'GIVE_ITEM', playerId: id, targetId: mate.id, item });
    if (give) return give;
  }

  // 5. Search a room once until it comes back empty.
  if (!memory.searchedEmpty.has(room.id)) {
    const search = first({ type: 'SEARCH', playerId: id });
    if (search) return search;
  }

  // 6. Open the way into the unknown.
  const doorsHere = Object.values(s.doors).filter((d) => d.roomA === p.roomId || d.roomB === p.roomId);
  const beyond = (d: (typeof doorsHere)[number]) => s.rooms[d.roomA === p.roomId ? d.roomB : d.roomA];
  const openOrder = doorsHere
    .filter((d) => !d.open && !beyond(d).discovered)
    .sort((a, b) => doorEase(s, p, a.type) - doorEase(s, p, b.type));
  const open = first(...openOrder.map((d): Action => ({ type: 'OPEN_DOOR', playerId: id, doorId: d.id })));
  if (open) return open;

  // 7. Walk towards the most useful known place.
  const step = nextStep(s, p, memory);
  if (step) {
    const move = first({ type: 'MOVE', playerId: id, toRoomId: step });
    if (move) return move;
  }

  // 8. Reopen a door that a collapse or short circuit closed, if any.
  const reopen = first(...doorsHere.filter((d) => !d.open).map((d): Action => ({ type: 'OPEN_DOOR', playerId: id, doorId: d.id })));
  if (reopen) return reopen;

  return { type: 'PASS', playerId: id };
}

/** Lower is easier for this crew member. */
function doorEase(s: GameState, p: Player, type: string) {
  switch (type) {
    case 'normal':
      return 0;
    case 'key':
      return p.inventory.includes('access_card') ? 0 : 9;
    case 'hack':
      return s.systems.power.repaired ? 0 : p.role === 'hacker' ? 1 : 3;
    case 'jammed':
      return p.role === 'soldier' || p.inventory.includes('crowbar') ? 1 : 3;
    default:
      return 5;
  }
}

/** First room to move into on the way to the best target, or null to stay. */
function nextStep(s: GameState, p: Player, memory: BotMemory): string | null {
  const known = (id: string) => s.rooms[id].discovered;
  const pod = s.escapePod;
  const podReady = !pod.launched && pod.repairProgress >= pod.repairRequired;
  const waterproof = p.role === 'diver' || p.inventory.includes('diving_suit');

  // Breadth-first over known rooms joined by open doors (no burning rooms).
  const prev = new Map<string, string | null>([[p.roomId, null]]);
  const order = [p.roomId];
  for (let i = 0; i < order.length; i++) {
    const cur = order[i];
    for (const d of Object.values(s.doors)) {
      if (!d.open) continue;
      const next = d.roomA === cur ? d.roomB : d.roomB === cur ? d.roomA : null;
      if (!next || prev.has(next) || !known(next) || s.rooms[next].fireRoundsLeft > 0) continue;
      prev.set(next, cur);
      order.push(next);
    }
  }

  const unrepaired = new Set<string>();
  for (const sys of Object.values(s.systems)) if (!sys.repaired) unrepaired.add(sys.roomId);
  if (!pod.launched && !podReady) unrepaired.add(pod.roomId);
  const frontier = (roomId: string) =>
    Object.values(s.doors).some((d) => !d.open && (d.roomA === roomId || d.roomB === roomId) && !s.rooms[d.roomA === roomId ? d.roomB : d.roomA].discovered);
  const needsHelp = (roomId: string) => s.players.some((o) => o.roomId === roomId && o.condition === 'unconscious' && !o.escaped);

  const goals: ((roomId: string) => boolean)[] = [
    (r) => podReady && r === pod.roomId,
    (r) => s.systems.power.repaired && s.systems.pumps.repaired && s.rooms[r].type === 'bridge',
    (r) => needsHelp(r) && (p.role === 'medic' || p.inventory.includes('medkit')),
    (r) => unrepaired.has(r),
    (r) => frontier(r),
    (r) => !memory.searchedEmpty.has(r),
  ];
  for (const goal of goals) {
    const target = order.find((r) => r !== p.roomId && goal(r) && (waterproof || !s.rooms[r].flooded || goal === goals[3]));
    if (!target) continue;
    let step = target;
    while (prev.get(step) !== p.roomId) step = prev.get(step)!;
    if (moveCost(p, s.rooms[step].flooded) <= s.actionsLeft) return step;
    return null;
  }
  return null;
}
