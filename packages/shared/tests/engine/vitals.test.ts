import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyAction, oxygenConsumption } from '../../src/engine';
import { Ctx } from '../../src/engine/context';
import { resolveEvent } from '../../src/engine/rules/events';
import { makeState } from './fixtures';

const endRound = (s: ReturnType<typeof makeState>) => {
  for (let guard = 0; guard < 10; guard++) {
    const round = s.round;
    const active = s.players[s.activePlayerIndex];
    s = applyAction(s, { type: 'PASS', playerId: active.id }).state;
    if (s.round !== round || s.status !== 'playing') return s;
  }
  return s;
};

describe('oxygen', () => {
  it('drops by the hull leak plus each breathing crew member (the diver breathes half)', () => {
    const s = makeState({ roles: ['engineer', 'medic', 'soldier', 'diver'] });
    expect(oxygenConsumption(s)).toBe(4 + 2 * 3 + 1);
  });

  it('drops less with fewer mouths and no leak once life support is fixed', () => {
    const s = makeState({ roles: ['engineer', 'medic', 'soldier'] });
    s.players[2].condition = 'dead';
    expect(oxygenConsumption(s)).toBe(4 + 2 * 2);
    s.systems.life_support.repaired = true;
    expect(oxygenConsumption(s)).toBe(4);
  });

  it('running out with nobody escaped is a defeat', () => {
    const s = makeState();
    s.oxygen = 3;
    const end = endRound(s);
    expect(end.status).toBe('lost');
  });

  it('a bottle of oxygen refills the shared supply', () => {
    const s = makeState();
    s.players[0].inventory.push('oxygen_tank');
    const { state } = applyAction(s, { type: 'USE_ITEM', playerId: 'p1', item: 'oxygen_tank' });
    expect(state.oxygen).toBe(100 + BALANCE.oxygen.oxygenTankRestore);
    expect(state.players[0].inventory).toEqual([]);
  });
});

describe('health', () => {
  it('ending the round in water hurts, unless diver or wearing a suit', () => {
    const s = makeState({ roles: ['engineer', 'diver', 'medic'] });
    s.rooms.r0.flooded = true;
    s.players[2].inventory.push('diving_suit');
    const end = endRound(s);
    expect(end.players.map((p) => p.health)).toEqual([2, 3, 3]);
  });

  it('at 0 lives a crew member falls unconscious and dies after the grace rounds', () => {
    let s = makeState({ roles: ['engineer', 'medic', 'soldier'] });
    s.rooms.r0.fireRoundsLeft = 0;
    s.players[0].health = 1;
    s.rooms.r0.flooded = true;
    s.players[1].roomId = 'r1';
    s.players[2].roomId = 'r1';
    s = endRound(s);
    expect(s.players[0].condition).toBe('unconscious');
    s.rooms.r0.flooded = false;
    for (let i = 0; i < BALANCE.health.roundsUnconsciousBeforeDeath; i++) s = endRound(s);
    expect(s.players[0].condition).toBe('dead');
  });

  it('the medic revives without items; others need a medkit', () => {
    const s = makeState({ roles: ['medic', 'engineer', 'soldier'] });
    s.players[1].condition = 'unconscious';
    s.players[1].health = 0;
    const { state } = applyAction(s, { type: 'REVIVE', playerId: 'p1', targetId: 'p2' });
    expect(state.players[1]).toMatchObject({ condition: 'ok', health: 1 });

    const t = makeState({ roles: ['engineer', 'medic', 'soldier'] });
    t.players[1].condition = 'unconscious';
    t.players[1].health = 0;
    expect(applyAction(t, { type: 'REVIVE', playerId: 'p1', targetId: 'p2' }).events[0].type).toBe('ActionRejected');
  });

  it('healing never goes above the maximum', () => {
    const s = makeState({ roles: ['medic', 'engineer'] });
    s.players[1].health = 2;
    const { state } = applyAction(s, { type: 'HEAL', playerId: 'p1', targetId: 'p2' });
    expect(state.players[1].health).toBe(3);
  });
});

describe('events', () => {
  it('a leak only floods discovered lower-deck rooms', () => {
    const s = makeState();
    s.rooms.r1.discovered = true;
    const ctx = new Ctx(s);
    resolveEvent(ctx, 'flood');
    expect(s.rooms.r1.flooded).toBe(false);
    expect(ctx.events.at(-1)).toMatchObject({ type: 'EventDrawn', card: 'flood', targetRoomId: null });

    s.rooms.r1.lowerDeck = true;
    resolveEvent(ctx, 'flood');
    expect(s.rooms.r1.flooded).toBe(true);
  });

  it('a collapse jams an open door', () => {
    const s = applyAction(makeState(), { type: 'OPEN_DOOR', playerId: 'p1', doorId: 'd0' }).state;
    resolveEvent(new Ctx(s), 'collapse');
    expect(s.doors.d0).toMatchObject({ open: false, type: 'jammed' });
  });

  it('the event deck reshuffles its discards when it runs out', () => {
    const s = makeState();
    s.eventDeck = [];
    s.eventDiscard = ['calm', 'fire'];
    const end = endRound(s);
    expect(end.eventDeck.length + end.eventDiscard.length).toBe(2);
  });
});
