// What the active player can try right now, phrased for the action panel.
// The engine still validates everything; this only decides what to offer.

import { BALANCE } from '@afloat/shared/config/balance';
import { ITEMS } from '@afloat/shared/content/items';
import { ROOM_NAMES, SYSTEM_NAMES, type SystemId } from '@afloat/shared/content/rooms';
import { CRAFTABLE, moveCost, successChance, type Action, type Door, type GameState, type Player } from '@afloat/shared/engine';

export interface ActionOption {
  label: string;
  /** Cost, odds or a reason it can't be done. */
  hint: string;
  action?: Action;
  /** Opens the escape-pod passenger dialog instead of acting directly. */
  launch?: boolean;
  /** Something this room is for (repair, launch, surface, pump): highlighted. */
  special?: boolean;
  disabled?: boolean;
}

const pct = (p: number) => `${Math.round(p * 100)}%`;

export const activePlayer = (s: GameState) => s.players[s.activePlayerIndex];

function rollBonus(p: Player, base: number) {
  return base + p.pendingBonus;
}

export function repairChance(p: Player) {
  const bonus = (p.role === 'engineer' ? BALANCE.roleBonus.engineerRepair : 0) + (p.inventory.includes('wrench') ? BALANCE.itemBonus.wrench : 0);
  return successChance(BALANCE.difficulty.repair, rollBonus(p, bonus));
}

export function actionOptions(s: GameState): ActionOption[] {
  const p = activePlayer(s);
  const room = s.rooms[p.roomId];
  const mates = s.players.filter((o) => o.id !== p.id && o.roomId === p.roomId && !o.escaped && o.condition !== 'dead');
  const out: ActionOption[] = [];

  out.push({ label: 'Buscar', hint: '', action: { type: 'SEARCH', playerId: p.id } });

  for (const id of Object.keys(s.systems) as SystemId[]) {
    const sys = s.systems[id];
    if (sys.roomId !== p.roomId || sys.repaired) continue;
    out.push({
      label: `Reparar ${SYSTEM_NAMES[id].toLowerCase()} ${sys.repairProgress}/${sys.repairRequired}`,
      hint: pct(repairChance(p)),
      action: { type: 'REPAIR', playerId: p.id, target: id },
      special: true,
    });
  }
  const pod = s.escapePod;
  if (pod.roomId === p.roomId && !pod.launched) {
    if (pod.repairProgress < pod.repairRequired) {
      out.push({
        label: `Reparar cápsula ${pod.repairProgress}/${pod.repairRequired}`,
        hint: pct(repairChance(p)),
        action: { type: 'REPAIR', playerId: p.id, target: 'escape_pod' },
        special: true,
      });
    } else {
      out.push({ label: 'Lanzar cápsula', hint: `${pod.seats} ${pod.seats === 1 ? 'plaza' : 'plazas'}`, launch: true, special: true });
    }
  }
  if (room.type === 'bridge') {
    const ready = s.systems.power.repaired && s.systems.pumps.repaired;
    out.push({
      label: 'Emerger',
      hint: ready ? '' : 'Falta energía y bombas',
      action: { type: 'SURFACE', playerId: p.id },
      disabled: !ready,
      special: true,
    });
  }
  if (room.type === 'lab') {
    const left = BALANCE.rooms.craft.maxPerGame - s.labCrafts;
    const cost = BALANCE.rooms.craft.cost;
    for (const item of CRAFTABLE) {
      out.push({
        label: `Fabricar ${ITEMS[item].name.toLowerCase()}`,
        hint: left <= 0 ? 'Sin materiales' : s.actionsLeft < cost ? `Cuesta ${cost} acciones` : `${cost} acciones · ${pct(successChance(BALANCE.difficulty.craft, rollBonus(p, 0)))}`,
        action: { type: 'CRAFT', playerId: p.id, item },
        disabled: left <= 0 || s.actionsLeft < cost,
        special: true,
      });
    }
  }
  if (room.type === 'cantina') {
    out.push({
      label: 'Comer y descansar',
      hint: p.rested ? 'Ya lo hiciste' : p.health >= p.maxHealth ? 'Tienes todas tus vidas' : `+${BALANCE.rooms.restHeal} vida · una vez`,
      action: { type: 'REST', playerId: p.id },
      disabled: p.rested || p.health >= p.maxHealth,
      special: true,
    });
  }
  if (room.flooded && s.systems.pumps.repaired) out.push({ label: 'Achicar agua', hint: '', action: { type: 'PUMP_OUT', playerId: p.id }, special: true });
  if (s.hull <= BALANCE.hull.shoreUpBelow) {
    out.push({ label: 'Apuntalar casco', hint: `+${BALANCE.hull.shoreUpGain} · ${pct(repairChance(p))}`, action: { type: 'SHORE_UP', playerId: p.id } });
  }

  const healer = p.role === 'medic' || p.inventory.includes('bandage') || p.inventory.includes('medkit');
  for (const m of mates) {
    if (m.condition === 'ok' && m.health < m.maxHealth) {
      out.push({ label: `Curar a ${m.name}`, hint: healer ? '' : 'Sin vendas ni botiquín', action: { type: 'HEAL', playerId: p.id, targetId: m.id }, disabled: !healer });
    }
    if (m.condition === 'unconscious') {
      const can = p.role === 'medic' || p.inventory.includes('medkit');
      out.push({ label: `Reanimar a ${m.name}`, hint: can ? '' : 'Sin botiquín', action: { type: 'REVIVE', playerId: p.id, targetId: m.id }, disabled: !can });
    }
  }
  if (p.health < p.maxHealth && healer) out.push({ label: 'Curarte', hint: '', action: { type: 'HEAL', playerId: p.id, targetId: p.id } });

  for (const item of new Set(p.inventory)) {
    if (item === 'oxygen_tank') out.push({ label: 'Bombona O₂', hint: `+${BALANCE.oxygen.oxygenTankRestore} O₂`, action: { type: 'USE_ITEM', playerId: p.id, item } });
    if (item === 'cigarettes') out.push({ label: 'Fumar', hint: `+1 tirada · −${BALANCE.oxygen.cigarettesCost} O₂`, action: { type: 'USE_ITEM', playerId: p.id, item } });
    for (const m of mates) out.push({ label: `Dar ${ITEMS[item].name.toLowerCase()} → ${m.name}`, hint: '', action: { type: 'GIVE_ITEM', playerId: p.id, targetId: m.id, item } });
  }

  out.push({ label: 'Pasar turno', hint: '', action: { type: 'PASS', playerId: p.id } });
  return out;
}

/** What lies behind a door as far as the crew knows. */
export function beyondName(s: GameState, door: Door, fromRoom: string) {
  const other = s.rooms[door.roomA === fromRoom ? door.roomB : door.roomA];
  if (other.discovered || other.scanned) return ROOM_NAMES[other.type] + (other.flooded ? ' (inundada)' : '');
  return 'zona desconocida';
}

export const DOOR_TYPE_NAME: Record<Door['type'], string> = {
  normal: 'Escotilla',
  key: 'Puerta con llave',
  hack: 'Puerta electrónica',
  one_way: 'Puerta bloqueada por un lado',
  jammed: 'Puerta atascada',
};

/** Options when the active player clicks a door. */
export function doorOptions(s: GameState, doorId: string): ActionOption[] {
  const p = activePlayer(s);
  const door = s.doors[doorId];
  const other = door.roomA === p.roomId ? door.roomB : door.roomB === p.roomId ? door.roomA : null;
  if (!other) return [{ label: 'Esta puerta no está en tu sala', hint: 'Acércate primero', disabled: true }];
  const target = s.rooms[other];
  const out: ActionOption[] = [];

  if (door.open) {
    const cost = moveCost(p, target.flooded);
    out.push({
      label: `Pasar a ${beyondName(s, door, p.roomId)}`,
      hint: target.fireRoundsLeft > 0 ? 'En llamas' : cost > 1 ? `${cost} acciones (agua)` : '',
      action: { type: 'MOVE', playerId: p.id, toRoomId: other },
      disabled: target.fireRoundsLeft > 0 || cost > s.actionsLeft,
    });
    return out;
  }

  const open: Action = { type: 'OPEN_DOOR', playerId: p.id, doorId };
  switch (door.type) {
    case 'normal':
      out.push({ label: 'Abrir', hint: '', action: open });
      break;
    case 'key': {
      const card = p.inventory.includes('access_card');
      out.push({ label: 'Abrir con tarjeta', hint: card ? '' : 'Necesitas una tarjeta de acceso', action: open, disabled: !card });
      break;
    }
    case 'hack': {
      if (s.systems.power.repaired) {
        out.push({ label: 'Abrir', hint: 'Hay energía: sin tirada', action: open });
        break;
      }
      const bonus = (p.role === 'hacker' ? BALANCE.roleBonus.hackerHack : 0) + (p.inventory.includes('laptop') ? BALANCE.itemBonus.laptop : 0);
      out.push({ label: 'Hackear', hint: pct(successChance(BALANCE.difficulty.hack, rollBonus(p, bonus))), action: open });
      break;
    }
    case 'jammed': {
      const bonus = (p.role === 'soldier' ? BALANCE.roleBonus.soldierForce : 0) + (p.inventory.includes('crowbar') ? BALANCE.itemBonus.crowbar : 0);
      out.push({ label: 'Forzar', hint: pct(successChance(BALANCE.difficulty.force, rollBonus(p, bonus))), action: open });
      break;
    }
    case 'one_way': {
      const can = door.openableFrom === p.roomId;
      out.push({ label: 'Abrir', hint: can ? '' : 'Bloqueada desde el otro lado', action: open, disabled: !can });
      break;
    }
  }
  if (p.role === 'hacker' && !target.discovered && !target.scanned) {
    out.push({ label: 'Escanear', hint: 'Ver qué hay detrás', action: { type: 'SCAN', playerId: p.id, doorId } });
  }
  return out;
}
