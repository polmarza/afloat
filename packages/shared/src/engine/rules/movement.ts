import { BALANCE } from '../../config/balance';
import { reject, type Ctx } from '../context';
import type { Player } from '../types';

/** Action cost of moving into a room (wading into water is slower). */
export function moveCost(p: Player, flooded: boolean) {
  if (!flooded) return 1;
  return p.role === 'diver' ? BALANCE.movement.diverFloodedCost : BALANCE.movement.floodedCost;
}

/** Validates a move and returns its cost; `move` then applies it. */
export function checkMove(ctx: Ctx, p: Player, toRoomId: string) {
  const door = ctx.doorBetween(p.roomId, toRoomId);
  if (!door) reject('No hay ninguna puerta entre esas salas.');
  if (!door.open) reject('La puerta está cerrada.');
  const target = ctx.room(toRoomId);
  if (target.fireRoundsLeft > 0) reject('Esa sala está en llamas.');
  const cost = moveCost(p, target.flooded);
  if (cost > ctx.s.actionsLeft) reject(`Entrar ahí cuesta ${cost} acciones y te quedan ${ctx.s.actionsLeft}.`);
  return { door, cost };
}

export function move(ctx: Ctx, p: Player, toRoomId: string, doorId: string) {
  const from = p.roomId;
  p.roomId = toRoomId;
  ctx.emit({ type: 'PlayerMoved', playerId: p.id, from, to: toRoomId, doorId });
  ctx.log(`${p.name} pasa a ${ctx.roomName(toRoomId)}.`);
}
