import { BALANCE } from '../../config/balance';
import { EVENT_NAMES, type EventCardId } from '../../content/events';
import type { Ctx } from '../context';
import { changeHull, changeOxygen, damage } from './vitals';

/** Draws the next ship event (reshuffling the discards when the deck runs out) and resolves it. */
export function drawEvent(ctx: Ctx) {
  const s = ctx.s;
  if (!s.eventDeck.length) {
    s.eventDeck = ctx.rng.shuffle(s.eventDiscard);
    s.eventDiscard = [];
  }
  const card = s.eventDeck.shift()!;
  s.eventDiscard.push(card);
  resolveEvent(ctx, card);
}

export function resolveEvent(ctx: Ctx, card: EventCardId) {
  const s = ctx.s;
  const rooms = Object.values(s.rooms);
  const doors = Object.values(s.doors);
  let targetRoomId: string | null = null;
  let targetDoorId: string | null = null;
  const none = () => ctx.log(`${EVENT_NAMES[card]}: por suerte, no afecta a ninguna zona conocida.`);

  switch (card) {
    case 'flood': {
      // Only the lower deck can hold water.
      const options = rooms.filter((r) => r.discovered && r.lowerDeck && !r.flooded);
      if (!options.length) {
        none();
        break;
      }
      const room = ctx.rng.pick(options);
      room.flooded = true;
      room.fireRoundsLeft = 0;
      targetRoomId = room.id;
      ctx.emit({ type: 'RoomFlooded', roomId: room.id });
      ctx.log(`ALERTA: fuga de agua en ${ctx.roomName(room)}.`);
      break;
    }
    case 'short_circuit': {
      const options = doors.filter((d) => d.type === 'hack' && d.open);
      if (!options.length) {
        none();
        break;
      }
      const door = ctx.rng.pick(options);
      door.open = false;
      targetDoorId = door.id;
      ctx.emit({ type: 'DoorClosed', doorId: door.id });
      ctx.log(`ALERTA: cortocircuito. Se cierra la puerta entre ${ctx.roomName(door.roomA)} y ${ctx.roomName(door.roomB)}.`);
      break;
    }
    case 'fire': {
      const options = rooms.filter((r) => r.discovered && !r.flooded && r.fireRoundsLeft === 0);
      if (!options.length) {
        none();
        break;
      }
      const room = ctx.rng.pick(options);
      room.fireRoundsLeft = BALANCE.fire.durationRounds;
      targetRoomId = room.id;
      ctx.emit({ type: 'RoomOnFire', roomId: room.id });
      ctx.log(`ALERTA: incendio en ${ctx.roomName(room)}.`);
      break;
    }
    case 'collapse': {
      const options = doors.filter((d) => d.open);
      if (!options.length) {
        none();
        break;
      }
      const door = ctx.rng.pick(options);
      door.open = false;
      door.type = 'jammed';
      targetDoorId = door.id;
      ctx.emit({ type: 'DoorJammed', doorId: door.id });
      const roomId = ctx.rng.pick([door.roomA, door.roomB]);
      targetRoomId = roomId;
      ctx.log(`ALERTA: derrumbe en ${ctx.roomName(roomId)}. Una puerta queda atascada.`);
      for (const p of ctx.active().filter((p) => p.roomId === roomId)) {
        if (ctx.rng.int(1, BALANCE.dice.sides) <= BALANCE.collapse.damageOnRollAtMost) damage(ctx, p, BALANCE.collapse.damage, 'derrumbe');
      }
      break;
    }
    case 'scrubber_failure':
      changeOxygen(ctx, -BALANCE.oxygen.scrubberFailureLoss);
      ctx.log(`ALERTA: fallo del depurador. −${BALANCE.oxygen.scrubberFailureLoss} de oxígeno.`);
      break;
    case 'calm':
      ctx.log('Calma. Solo se oye el casco crujir.');
      break;
  }
  // Leaks, collapses and fires also weaken the hull, whether or not they hit a known room.
  const hullDamage = BALANCE.hull.eventDamage[card];
  if (hullDamage) {
    changeHull(ctx, -hullDamage);
    ctx.log(`El casco se resiente: −${hullDamage} (integridad ${ctx.s.hull}).`);
  }
  ctx.emit({ type: 'EventDrawn', card, targetRoomId, targetDoorId });
}
