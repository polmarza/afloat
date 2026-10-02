import { BALANCE } from '../../config/balance';
import { SYSTEM_NAMES, type SystemId } from '../../content/rooms';
import { reject, type Ctx } from '../context';
import type { Player, RepairTarget } from '../types';
import { roll } from './dice';
import { revealRoom } from './doors';
import { changeHull } from './vitals';

export function repair(ctx: Ctx, p: Player, target: RepairTarget) {
  const thing = target === 'escape_pod' ? ctx.s.escapePod : ctx.s.systems[target];
  if (thing.roomId !== p.roomId) reject('Eso no está en tu sala.');
  const done = target === 'escape_pod' ? ctx.s.escapePod.repairProgress >= ctx.s.escapePod.repairRequired : ctx.s.systems[target].repaired;
  if (done) reject('Ya está reparado.');
  if (target === 'escape_pod' && ctx.s.escapePod.launched) reject('La cápsula ya se lanzó.');

  const name = target === 'escape_pod' ? 'cápsula' : SYSTEM_NAMES[target].toLowerCase();
  const ok = roll(ctx, p, `Reparar ${name}`, BALANCE.difficulty.repair, [
    { label: 'ingeniero', value: p.role === 'engineer' ? BALANCE.roleBonus.engineerRepair : 0 },
    { label: 'llave inglesa', value: ctx.has(p, 'wrench') ? BALANCE.itemBonus.wrench : 0 },
  ]).success;
  if (!ok) return;

  thing.repairProgress++;
  ctx.emit({ type: 'RepairProgressed', target, progress: thing.repairProgress, required: thing.repairRequired });
  if (thing.repairProgress < thing.repairRequired) return;
  if (target !== 'escape_pod') ctx.s.systems[target].repaired = true;
  ctx.emit({ type: 'SystemRepaired', target });
  ctx.log(target === 'escape_pod' ? '¡La cápsula de escape está lista!' : `¡${SYSTEM_NAMES[target]} reparado!`);
  if (target !== 'escape_pod') onSystemRepaired(ctx, target);
}

function onSystemRepaired(ctx: Ctx, system: SystemId) {
  if (system !== 'power') return;
  // Lights come back: every room behind a door of an explored room is revealed and lit.
  const discovered = Object.values(ctx.s.rooms).filter((r) => r.discovered);
  for (const r of discovered) r.lit = true;
  for (const door of Object.values(ctx.s.doors)) {
    for (const r of discovered) {
      const other = ctx.otherSide(door, r.id);
      if (other) revealRoom(ctx, other, null);
    }
  }
  ctx.log('Vuelve la luz: la alarma se apaga y las puertas electrónicas responden.');
}

/** Props up the hull with whatever is at hand: same roll as repairing. */
export function shoreUp(ctx: Ctx, p: Player) {
  if (ctx.s.hull > BALANCE.hull.shoreUpBelow) reject('El casco aún aguanta: no hace falta apuntalarlo.');
  const ok = roll(ctx, p, 'Apuntalar casco', BALANCE.difficulty.repair, [
    { label: 'ingeniero', value: p.role === 'engineer' ? BALANCE.roleBonus.engineerRepair : 0 },
    { label: 'llave inglesa', value: ctx.has(p, 'wrench') ? BALANCE.itemBonus.wrench : 0 },
  ]).success;
  if (!ok) return;
  changeHull(ctx, BALANCE.hull.shoreUpGain);
  ctx.log(`${p.name} apuntala el casco: +${BALANCE.hull.shoreUpGain} (integridad ${ctx.s.hull}).`);
}

export function pumpOut(ctx: Ctx, p: Player) {
  if (!ctx.s.systems.pumps.repaired) reject('Las bombas no funcionan todavía.');
  const room = ctx.roomOf(p);
  if (!room.flooded) reject('Esta sala no tiene agua.');
  room.flooded = false;
  ctx.emit({ type: 'RoomDrained', roomId: room.id });
  ctx.log(`${p.name} achica el agua de ${ctx.roomName(room)}.`);
}
