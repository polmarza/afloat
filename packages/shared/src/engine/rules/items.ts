import { BALANCE } from '../../config/balance';
import type { ItemId } from '../../content/items';
import { reject, type Ctx } from '../context';
import type { Player } from '../types';
import { changeOxygen, heal as healPlayer, revive as revivePlayer } from './vitals';

export function search(ctx: Ctx, p: Player) {
  const room = ctx.roomOf(p);
  const item = room.items.shift() ?? null;
  if (item) p.inventory.push(item);
  ctx.emit({ type: 'ItemFound', playerId: p.id, item });
  ctx.log(item ? `${p.name} encuentra: ${ctx.itemName(item)}.` : `${p.name} busca, pero no encuentra nada útil.`);
}

/** A crew member in the same room, alive and still on board. */
function companion(ctx: Ctx, p: Player, targetId: string) {
  const t = ctx.player(targetId);
  if (t.escaped || t.condition === 'dead') reject('Ese tripulante ya no está a bordo.');
  if (t.roomId !== p.roomId) reject('Tiene que estar en tu misma sala.');
  return t;
}

export function heal(ctx: Ctx, p: Player, targetId: string) {
  const t = companion(ctx, p, targetId);
  if (t.condition !== 'ok') reject('Está inconsciente: hay que reanimarle.');
  if (t.health >= t.maxHealth) reject('Ya tiene todas sus vidas.');
  let amount: number;
  let used: ItemId | null = null;
  if (p.role === 'medic') amount = BALANCE.roleBonus.medicHealAmount;
  else if (ctx.has(p, 'bandage')) [amount, used] = [BALANCE.heal.bandage, 'bandage'];
  else if (ctx.has(p, 'medkit')) [amount, used] = [BALANCE.heal.medkit, 'medkit'];
  else reject('Necesitas vendas o un botiquín.');
  if (used) ctx.removeItem(p, used);
  healPlayer(ctx, t, amount);
  ctx.log(`${p.name} cura a ${t.name}${used ? ` con ${ctx.itemName(used).toLowerCase()}` : ''}.`);
}

export function revive(ctx: Ctx, p: Player, targetId: string) {
  const t = companion(ctx, p, targetId);
  if (t.condition !== 'unconscious') reject('No está inconsciente.');
  if (p.role !== 'medic') {
    if (!ctx.has(p, 'medkit')) reject('Necesitas un botiquín para reanimar.');
    ctx.removeItem(p, 'medkit');
  }
  revivePlayer(ctx, t);
  ctx.log(`${p.name} reanima a ${t.name}. Vuelve con 1 vida.`);
}

export function give(ctx: Ctx, p: Player, targetId: string, item: ItemId) {
  if (targetId === p.id) reject('No puedes dártelo a ti mismo.');
  const t = companion(ctx, p, targetId);
  if (!ctx.has(p, item)) reject('No llevas ese objeto.');
  ctx.removeItem(p, item);
  t.inventory.push(item);
  ctx.emit({ type: 'ItemGiven', fromId: p.id, toId: t.id, item });
  ctx.log(`${p.name} da ${ctx.itemName(item).toLowerCase()} a ${t.name}.`);
}

/** Items with a direct effect. The rest work passively from the inventory. */
export function use(ctx: Ctx, p: Player, item: ItemId) {
  if (!ctx.has(p, item)) reject('No llevas ese objeto.');
  switch (item) {
    case 'oxygen_tank':
      ctx.removeItem(p, item);
      changeOxygen(ctx, BALANCE.oxygen.oxygenTankRestore);
      ctx.log(`${p.name} abre una bombona: +${BALANCE.oxygen.oxygenTankRestore} de oxígeno.`);
      break;
    case 'cigarettes':
      ctx.removeItem(p, item);
      p.pendingBonus += BALANCE.itemBonus.cigarettes;
      changeOxygen(ctx, -BALANCE.oxygen.cigarettesCost);
      ctx.log(`${p.name} se fuma un cigarrillo para calmar los nervios (+1 a su próxima tirada, −${BALANCE.oxygen.cigarettesCost} de oxígeno).`);
      break;
    default:
      reject(`${ctx.itemName(item)} funciona solo, sin gastar acciones.`);
  }
  ctx.emit({ type: 'ItemUsed', playerId: p.id, item });
}
