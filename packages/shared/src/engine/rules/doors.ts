import { BALANCE } from '../../config/balance';
import { reject, type Ctx } from '../context';
import type { Door, Player } from '../types';
import { roll } from './dice';

export function revealRoom(ctx: Ctx, roomId: string, fromDoor: Door | null) {
  const room = ctx.room(roomId);
  if (room.discovered) return;
  room.discovered = true;
  if (ctx.s.systems.power.repaired) room.lit = true;
  ctx.emit({ type: 'RoomRevealed', roomId, fromDoorId: fromDoor?.id ?? null });
  ctx.log(`Se descubre: ${ctx.roomName(room)}${room.flooded ? ' (inundada)' : ''}.`);
}

/** Checks that need no action spent: rejected attempts are free. Returns the door. */
export function checkDoorAccess(ctx: Ctx, p: Player, doorId: string) {
  const door = ctx.s.doors[doorId];
  if (!door) reject('Esa puerta no existe.');
  if (!ctx.otherSide(door, p.roomId)) reject('La puerta no está en tu sala.');
  return door;
}

export function openDoor(ctx: Ctx, p: Player, doorId: string) {
  const door = checkDoorAccess(ctx, p, doorId);
  if (door.open) reject('La puerta ya está abierta.');
  if (door.type === 'key' && !ctx.has(p, 'access_card')) reject('Necesitas una tarjeta de acceso.');
  if (door.type === 'one_way' && door.openableFrom !== p.roomId) reject('Está bloqueada desde el otro lado.');

  let success = true;
  if (door.type === 'hack' && !ctx.s.systems.power.repaired) {
    success = roll(ctx, p, 'Hackeo', BALANCE.difficulty.hack, [
      { label: 'informático', value: p.role === 'hacker' ? BALANCE.roleBonus.hackerHack : 0 },
      { label: 'portátil', value: ctx.has(p, 'laptop') ? BALANCE.itemBonus.laptop : 0 },
    ]).success;
  } else if (door.type === 'jammed') {
    success = roll(ctx, p, 'Forzar', BALANCE.difficulty.force, [
      { label: 'militar', value: p.role === 'soldier' ? BALANCE.roleBonus.soldierForce : 0 },
      { label: 'palanca', value: ctx.has(p, 'crowbar') ? BALANCE.itemBonus.crowbar : 0 },
    ]).success;
  }

  if (!success) {
    ctx.emit({ type: 'DoorFailed', doorId });
    return;
  }
  door.open = true;
  ctx.emit({ type: 'DoorOpened', doorId, byPlayerId: p.id });
  ctx.log(`${p.name} abre la puerta hacia ${ctx.roomName(ctx.otherSide(door, p.roomId)!)}.`);
  revealRoom(ctx, ctx.otherSide(door, p.roomId)!, door);
}

/** The hacker reads what's behind a closed door without opening it. */
export function scan(ctx: Ctx, p: Player, doorId: string) {
  if (p.role !== 'hacker') reject('Solo el informático puede escanear.');
  const door = checkDoorAccess(ctx, p, doorId);
  const target = ctx.room(ctx.otherSide(door, p.roomId)!);
  if (target.discovered || target.scanned) reject('Ya sabes qué hay al otro lado.');
  target.scanned = true;
  ctx.emit({ type: 'RoomScanned', roomId: target.id });
  ctx.log(`Escaneo: al otro lado está ${ctx.roomName(target)}${target.flooded ? ', inundada' : ''}.`);
}
