import { BALANCE } from '../../config/balance';
import type { Ctx } from '../context';
import type { GameState, Player } from '../types';

export function changeOxygen(ctx: Ctx, delta: number) {
  const from = ctx.s.oxygen;
  ctx.s.oxygen = Math.max(0, Math.round((from + delta) * 10) / 10);
  ctx.emit({ type: 'OxygenChanged', from, to: ctx.s.oxygen });
}

export function changeHull(ctx: Ctx, delta: number) {
  if (delta === 0) return;
  const from = ctx.s.hull;
  ctx.s.hull = Math.max(0, Math.min(BALANCE.hull.initial, from + delta));
  ctx.emit({ type: 'HullChanged', from, to: ctx.s.hull });
}

/** Oxygen used per round: hull leak (until life support is fixed) plus every breathing crew member. */
export function oxygenConsumption(s: GameState) {
  const base = s.systems.life_support.repaired ? 0 : BALANCE.oxygen.baseConsumption;
  const breathing = s.players
    .filter((p) => !p.escaped && p.condition !== 'dead')
    .reduce((sum, p) => sum + BALANCE.oxygen.perCrewMember * (p.role === 'diver' ? BALANCE.oxygen.diverMultiplier : 1), 0);
  return base + breathing;
}

export function damage(ctx: Ctx, p: Player, amount: number, cause: string) {
  if (p.condition !== 'ok' || p.escaped || amount <= 0) return;
  p.health = Math.max(0, p.health - amount);
  ctx.emit({ type: 'PlayerDamaged', playerId: p.id, amount, cause });
  ctx.log(`${p.name} pierde ${amount} ${amount === 1 ? 'vida' : 'vidas'} (${cause}).`);
  if (p.health === 0) {
    p.condition = 'unconscious';
    p.roundsUnconscious = 0;
    ctx.emit({ type: 'PlayerUnconscious', playerId: p.id });
    ctx.log(`${p.name} cae inconsciente. Hay ${BALANCE.health.roundsUnconsciousBeforeDeath} rondas para reanimarle.`);
  }
}

export function heal(ctx: Ctx, p: Player, amount: number) {
  const before = p.health;
  p.health = Math.min(p.maxHealth, p.health + amount);
  ctx.emit({ type: 'PlayerHealed', playerId: p.id, amount: p.health - before });
}

export function revive(ctx: Ctx, p: Player) {
  p.condition = 'ok';
  p.health = 1;
  p.roundsUnconscious = 0;
  ctx.emit({ type: 'PlayerRevived', playerId: p.id });
}

/** Unconscious crew get closer to death; past the limit they die. */
export function tickUnconscious(ctx: Ctx) {
  for (const p of ctx.s.players) {
    if (p.condition !== 'unconscious' || p.escaped) continue;
    p.roundsUnconscious++;
    if (p.roundsUnconscious > BALANCE.health.roundsUnconsciousBeforeDeath) {
      p.condition = 'dead';
      ctx.emit({ type: 'PlayerDied', playerId: p.id });
      ctx.log(`${p.name} ha muerto. Su jugador pasa a espectador.`);
    }
  }
}

/** End-of-round damage from water and fire. */
export function environmentalDamage(ctx: Ctx) {
  for (const p of ctx.active()) {
    const room = ctx.roomOf(p);
    const waterproof = p.role === 'diver' || ctx.has(p, 'diving_suit');
    if (room.flooded && !waterproof) damage(ctx, p, BALANCE.flood.damage, 'agua helada');
    if (room.fireRoundsLeft > 0) damage(ctx, p, BALANCE.fire.damage, 'fuego');
  }
}
