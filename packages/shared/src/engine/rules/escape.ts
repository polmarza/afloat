import { reject, type Ctx } from '../context';
import type { Player } from '../types';

export function launchPod(ctx: Ctx, p: Player, passengerIds: string[]) {
  const pod = ctx.s.escapePod;
  if (pod.roomId !== p.roomId) reject('La cápsula no está en esta sala.');
  if (pod.launched) reject('La cápsula ya se lanzó.');
  if (pod.repairProgress < pod.repairRequired) reject('La cápsula aún no está reparada.');
  const ids = [...new Set(passengerIds)];
  if (!ids.length) reject('Elige quién sube a la cápsula.');
  if (ids.length > pod.seats) reject(`La cápsula solo tiene ${pod.seats} ${pod.seats === 1 ? 'plaza' : 'plazas'}.`);
  const passengers = ids.map((id) => ctx.player(id));
  if (passengers.some((t) => t.roomId !== p.roomId || t.condition !== 'ok' || t.escaped)) {
    reject('Solo pueden subir tripulantes conscientes que estén en esta sala.');
  }
  pod.launched = true;
  for (const t of passengers) {
    t.escaped = true;
    ctx.emit({ type: 'PlayerEscaped', playerId: t.id, how: 'pod' });
  }
  ctx.log(`¡La cápsula sale disparada hacia la superficie con ${passengers.map((t) => t.name).join(', ')}!`);
}

export function surface(ctx: Ctx, p: Player) {
  if (ctx.roomOf(p).type !== 'bridge') reject('Hay que estar en la sala de control para emerger.');
  if (!ctx.s.systems.power.repaired) reject('No hay energía para emerger.');
  if (!ctx.s.systems.pumps.repaired) reject('Las bombas de lastre no funcionan.');
  for (const t of ctx.aboard()) {
    t.escaped = true;
    ctx.emit({ type: 'PlayerEscaped', playerId: t.id, how: 'surface' });
  }
  ctx.s.surfaced = true;
  ctx.log('¡Se vacían los tanques de lastre y el submarino sale a flote!');
  win(ctx);
}

/** The crew decides to stop once someone is safe: whoever escaped counts as the win. */
export function endGame(ctx: Ctx) {
  if (!ctx.s.players.some((t) => t.escaped)) reject('Nadie se ha salvado todavía.');
  ctx.log('La tripulación que queda a bordo se rinde: la partida termina.');
  win(ctx);
}

export function win(ctx: Ctx) {
  if (ctx.s.status !== 'playing') return;
  ctx.s.status = 'won';
  ctx.emit({ type: 'GameWon' });
  const saved = ctx.s.players.filter((t) => t.escaped).map((t) => t.name);
  ctx.log(`VICTORIA. Salen a flote: ${saved.join(', ')}.`);
}

export function lose(ctx: Ctx, reason: string) {
  if (ctx.s.status !== 'playing') return;
  ctx.s.status = 'lost';
  ctx.emit({ type: 'GameLost', reason });
  ctx.log(`DERROTA. ${reason}`);
}

/** Ends the game when nobody conscious is left on board, or when the oxygen ran out. */
export function checkEnd(ctx: Ctx) {
  if (ctx.s.status !== 'playing') return;
  const someoneEscaped = ctx.s.players.some((t) => t.escaped);
  if (ctx.s.oxygen <= 0) {
    if (someoneEscaped) win(ctx);
    else lose(ctx, 'Se ha acabado el oxígeno.');
    return;
  }
  if (ctx.s.hull <= 0) {
    if (someoneEscaped) win(ctx);
    else lose(ctx, 'El casco ha cedido a la presión.');
    return;
  }
  if (!ctx.active().length) {
    if (someoneEscaped) win(ctx);
    else lose(ctx, 'No queda nadie consciente a bordo.');
  }
}

export const canAct = (p: Player) => p.condition === 'ok' && !p.escaped;
