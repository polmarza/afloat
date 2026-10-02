// Single entry point of the rules: (state, action) → (new state, events).
// The input state is never mutated; a rejected action returns it unchanged.

import { Ctx, Rejected, reject } from './context';
import { endTurn } from './phases';
import { checkDoorAccess, openDoor, scan } from './rules/doors';
import { checkEnd, endGame, launchPod, surface } from './rules/escape';
import { give, heal, revive, search, use } from './rules/items';
import { checkMove, move } from './rules/movement';
import { checkCraft, craft, rest } from './rules/rooms';
import { pumpOut, repair, shoreUp } from './rules/systems';
import type { Action, ActionResult, GameState } from './types';

export function applyAction(state: GameState, action: Action): ActionResult {
  const ctx = new Ctx(structuredClone(state));
  try {
    perform(ctx, action);
  } catch (e) {
    if (e instanceof Rejected) return { state, events: [{ type: 'ActionRejected', reason: e.message }] };
    throw e;
  }
  return { state: ctx.s, events: ctx.events };
}

function perform(ctx: Ctx, action: Action) {
  const s = ctx.s;
  if (s.status !== 'playing') reject('La partida ha terminado.');
  if (s.phase !== 'crew') reject('No es momento de actuar.');
  const p = ctx.player(action.playerId);
  if (s.players[s.activePlayerIndex].id !== p.id) reject('No es tu turno.');

  let cost = 1;
  switch (action.type) {
    case 'PASS':
      ctx.log(`${p.name} pasa.`);
      cost = s.actionsLeft;
      break;
    case 'MOVE': {
      const { door, cost: moveCost } = checkMove(ctx, p, action.toRoomId);
      cost = moveCost;
      move(ctx, p, action.toRoomId, door.id);
      break;
    }
    case 'OPEN_DOOR':
      checkDoorAccess(ctx, p, action.doorId);
      openDoor(ctx, p, action.doorId);
      break;
    case 'SEARCH':
      search(ctx, p);
      break;
    case 'REPAIR':
      repair(ctx, p, action.target);
      break;
    case 'HEAL':
      heal(ctx, p, action.targetId);
      break;
    case 'REVIVE':
      revive(ctx, p, action.targetId);
      break;
    case 'GIVE_ITEM':
      give(ctx, p, action.targetId, action.item);
      break;
    case 'USE_ITEM':
      use(ctx, p, action.item);
      break;
    case 'SCAN':
      scan(ctx, p, action.doorId);
      break;
    case 'PUMP_OUT':
      pumpOut(ctx, p);
      break;
    case 'LAUNCH_POD':
      launchPod(ctx, p, action.passengers);
      break;
    case 'SURFACE':
      surface(ctx, p);
      break;
    case 'SHORE_UP':
      shoreUp(ctx, p);
      break;
    case 'CRAFT':
      cost = checkCraft(ctx, p, action.item);
      craft(ctx, p, action.item);
      break;
    case 'REST':
      rest(ctx, p);
      break;
    case 'END_GAME':
      endGame(ctx);
      return;
  }

  s.actionsLeft = Math.max(0, s.actionsLeft - cost);
  checkEnd(ctx);
  if (s.status !== 'playing') return;
  // The turn ends when the actions run out or the player can no longer act (escaped, knocked out).
  if (s.actionsLeft === 0 || p.escaped || p.condition !== 'ok') endTurn(ctx);
}
