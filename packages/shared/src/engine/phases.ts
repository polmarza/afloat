// Round structure: Crisis → Crew (one turn per player) → Consequences.

import { BALANCE } from '../config/balance';
import type { Ctx } from './context';
import { canAct, checkEnd } from './rules/escape';
import { drawEvent } from './rules/events';
import { greenhouseOxygen } from './rules/rooms';
import { changeHull, changeOxygen, environmentalDamage, oxygenConsumption, tickUnconscious } from './rules/vitals';

/** Oxygen drops and the ship throws an event at the crew; then the first turn starts. */
export function runCrisis(ctx: Ctx) {
  const s = ctx.s;
  s.phase = 'crisis';
  ctx.emit({ type: 'PhaseChanged', phase: 'crisis', round: s.round });
  ctx.log(`— Ronda ${s.round} —`);
  const used = oxygenConsumption(s);
  changeOxygen(ctx, -used);
  ctx.log(`Oxígeno: −${used} (quedan ${s.oxygen}).`);
  if (s.status === 'playing' && s.oxygen > 0) greenhouseOxygen(ctx);
  changeHull(ctx, -BALANCE.hull.perRound);
  ctx.log(`Casco: −${BALANCE.hull.perRound} por la presión (integridad ${s.hull}).`);
  checkEnd(ctx);
  if (s.status !== 'playing') return;

  if (s.round >= BALANCE.firstEventRound) {
    drawEvent(ctx);
    checkEnd(ctx);
    if (s.status !== 'playing') return;
  }
  startCrewPhase(ctx);
}

function startCrewPhase(ctx: Ctx) {
  const s = ctx.s;
  s.phase = 'crew';
  ctx.emit({ type: 'PhaseChanged', phase: 'crew', round: s.round });
  const first = s.players.findIndex(canAct);
  if (first < 0) {
    runConsequences(ctx);
    return;
  }
  beginTurn(ctx, first);
}

function beginTurn(ctx: Ctx, index: number) {
  ctx.s.activePlayerIndex = index;
  ctx.s.actionsLeft = BALANCE.actionsPerTurn;
  ctx.emit({ type: 'TurnChanged', playerId: ctx.s.players[index].id });
}

/** Passes the turn to the next player who can act, or closes the round. */
export function endTurn(ctx: Ctx) {
  const s = ctx.s;
  const next = s.players.findIndex((p, i) => i > s.activePlayerIndex && canAct(p));
  if (next >= 0) beginTurn(ctx, next);
  else runConsequences(ctx);
}

/** Water and fire hurt, fires burn down, the unconscious slip away; then a new round. */
export function runConsequences(ctx: Ctx) {
  const s = ctx.s;
  s.phase = 'consequences';
  ctx.emit({ type: 'PhaseChanged', phase: 'consequences', round: s.round });
  environmentalDamage(ctx);
  for (const room of Object.values(s.rooms)) {
    if (room.fireRoundsLeft <= 0) continue;
    room.fireRoundsLeft--;
    if (room.fireRoundsLeft === 0) {
      ctx.emit({ type: 'FireOut', roomId: room.id });
      ctx.log(`El fuego de ${ctx.roomName(room)} se ha apagado.`);
    }
  }
  tickUnconscious(ctx);
  checkEnd(ctx);
  if (s.status !== 'playing') return;
  s.round++;
  runCrisis(ctx);
}
