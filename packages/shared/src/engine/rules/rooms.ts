// What the special rooms are for: greenhouse (oxygen), laboratory (crafting)
// and cantina (eat and rest).

import { BALANCE } from '../../config/balance';
import { reject, type Ctx } from '../context';
import type { CraftableItem, Player } from '../types';
import { roll } from './dice';
import { changeOxygen, heal } from './vitals';

export const CRAFTABLE: CraftableItem[] = ['medkit', 'oxygen_tank'];

/** Start of each round: once found and with power back, the plants make oxygen. */
export function greenhouseOxygen(ctx: Ctx) {
  const s = ctx.s;
  const greenhouse = Object.values(s.rooms).find((r) => r.type === 'greenhouse');
  if (!greenhouse?.discovered || !s.systems.power.repaired) return;
  changeOxygen(ctx, BALANCE.rooms.greenhouseOxygen);
  ctx.log(`El invernadero produce +${BALANCE.rooms.greenhouseOxygen} de oxígeno (quedan ${s.oxygen}).`);
}

/** Checks a craft can be tried; returns its cost in actions. */
export function checkCraft(ctx: Ctx, p: Player, item: CraftableItem) {
  if (ctx.roomOf(p).type !== 'lab') reject('Hay que estar en el laboratorio.');
  if (!CRAFTABLE.includes(item)) reject('Eso no se puede fabricar.');
  if (ctx.s.labCrafts >= BALANCE.rooms.craft.maxPerGame) reject('En el laboratorio ya no quedan materiales.');
  if (ctx.s.actionsLeft < BALANCE.rooms.craft.cost) reject(`Fabricar cuesta ${BALANCE.rooms.craft.cost} acciones.`);
  return BALANCE.rooms.craft.cost;
}

export function craft(ctx: Ctx, p: Player, item: CraftableItem) {
  const name = ctx.itemName(item).toLowerCase();
  if (!roll(ctx, p, `Fabricar ${name}`, BALANCE.difficulty.craft, []).success) return;
  ctx.s.labCrafts++;
  p.inventory.push(item);
  ctx.emit({ type: 'ItemCrafted', playerId: p.id, item });
  const left = BALANCE.rooms.craft.maxPerGame - ctx.s.labCrafts;
  ctx.log(`${p.name} fabrica: ${name}. ${left ? `Quedan materiales para ${left} más.` : 'Se han acabado los materiales.'}`);
}

export function rest(ctx: Ctx, p: Player) {
  if (ctx.roomOf(p).type !== 'cantina') reject('Hay que estar en la cantina.');
  if (p.rested) reject('Ya has comido y descansado en esta partida.');
  if (p.health >= p.maxHealth) reject('Ya tienes todas tus vidas.');
  p.rested = true;
  heal(ctx, p, BALANCE.rooms.restHeal);
  ctx.log(`${p.name} come algo y descansa un momento.`);
}
