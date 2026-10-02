import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyAction } from '../../src/engine';
import { Ctx } from '../../src/engine/context';
import { resolveEvent } from '../../src/engine/rules/events';
import { makeState, nextRoll } from './fixtures';

const passRound = (s: ReturnType<typeof makeState>) => {
  s = applyAction(s, { type: 'PASS', playerId: 'p1' }).state;
  return applyAction(s, { type: 'PASS', playerId: 'p2' }).state;
};

describe('hull', () => {
  it('loses integrity to the pressure every round, even with life support fixed', () => {
    const s = makeState();
    s.systems.life_support.repaired = true;
    const next = passRound(s);
    expect(next.hull).toBe(BALANCE.hull.initial - BALANCE.hull.perRound);
  });

  it('leaks, collapses and fires damage the hull', () => {
    const s = makeState();
    const ctx = new Ctx(s);
    resolveEvent(ctx, 'flood');
    expect(s.hull).toBe(BALANCE.hull.initial - BALANCE.hull.eventDamage.flood);
    resolveEvent(ctx, 'calm');
    expect(s.hull).toBe(BALANCE.hull.initial - BALANCE.hull.eventDamage.flood);
  });

  it('a hull at 0 is a defeat if nobody escaped', () => {
    const s = makeState();
    s.hull = 1;
    expect(passRound(s).status).toBe('lost');
  });

  it('shoring up uses the repair roll, only once the hull is damaged', () => {
    const s = nextRoll(makeState(), 4);
    s.hull = 10;
    const { state } = applyAction(s, { type: 'SHORE_UP', playerId: 'p1' });
    expect(state.hull).toBe(10 + BALANCE.hull.shoreUpGain);

    const sound = makeState();
    sound.hull = BALANCE.hull.shoreUpBelow + 1;
    expect(applyAction(sound, { type: 'SHORE_UP', playerId: 'p1' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'El casco aún aguanta: no hace falta apuntalarlo.',
    });
  });
});

describe('ending early', () => {
  it('needs someone saved', () => {
    expect(applyAction(makeState(), { type: 'END_GAME', playerId: 'p1' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'Nadie se ha salvado todavía.',
    });
  });

  it('is a victory once someone escaped', () => {
    const s = makeState({ roles: ['engineer', 'medic', 'soldier'] });
    s.players[1].escaped = true;
    const { state } = applyAction(s, { type: 'END_GAME', playerId: 'p1' });
    expect(state.status).toBe('won');
  });
});
