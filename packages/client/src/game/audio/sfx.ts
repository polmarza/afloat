// Which sound goes with each engine event. App calls `eventSound` at the
// moment it animates the event, so sound and picture stay together (also for
// other players' actions online).

import type { GameEvent } from '@afloat/shared/engine';
import type { Sound } from './engine';
import * as r from './recipes';

export interface EventSoundContext {
  /** The new active crew member is played from this browser. */
  myTurn?: boolean;
}

export function eventSound(s: Sound, e: GameEvent, ctx: EventSoundContext = {}) {
  switch (e.type) {
    case 'DiceRolled':
      return r.dice(s, e.dice.success);
    case 'DoorOpened':
      return r.doorOpen(s);
    case 'DoorFailed':
      return r.doorFail(s);
    case 'DoorClosed':
    case 'DoorJammed':
      return r.doorSlam(s);
    case 'RoomRevealed':
      return r.roomReveal(s);
    case 'RoomScanned':
      return r.sonar(s);
    case 'ItemFound':
      return r.search(s, !!e.item);
    case 'ItemGiven':
    case 'ItemUsed':
      return r.itemClick(s);
    case 'ItemCrafted':
      return r.craft(s);
    case 'RepairProgressed':
      return r.repair(s);
    case 'SystemRepaired':
      return r.systemOnline(s);
    case 'PlayerHealed':
    case 'PlayerRevived':
      return r.heal(s);
    case 'PlayerDamaged':
      return r.damage(s);
    case 'PlayerUnconscious':
      return r.knockedOut(s);
    case 'PlayerDied':
      return r.death(s);
    case 'HullChanged':
      return e.to < e.from ? r.hullCreak(s) : r.repair(s);
    case 'EventDrawn':
      return r.eventCard(s, e.card);
    case 'RoomFlooded':
      return r.flood(s);
    case 'RoomDrained':
      return r.drain(s);
    case 'RoomOnFire':
      return r.fire(s);
    case 'FireOut':
      return r.steam(s);
    case 'PhaseChanged':
      return e.phase === 'crisis' ? r.roundBell(s) : undefined;
    case 'TurnChanged':
      return ctx.myTurn ? r.yourTurn(s) : undefined;
    case 'PlayerEscaped':
      return e.how === 'pod' ? r.podLaunch(s) : r.surface(s);
    case 'GameWon':
      return r.victory(s);
    case 'GameLost':
      return r.defeat(s);
    // Moves sound step by step while walking; rejections and the counters have no sound of their own.
    case 'PlayerMoved':
    case 'ActionRejected':
    case 'OxygenChanged':
      return undefined;
  }
}
