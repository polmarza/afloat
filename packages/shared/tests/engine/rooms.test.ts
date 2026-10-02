import { describe, expect, it } from 'vitest';
import { BALANCE } from '../../src/config/balance';
import { applyAction } from '../../src/engine';
import { makeState, nextRoll } from './fixtures';

const passRound = (s: ReturnType<typeof makeState>) => {
  s = applyAction(s, { type: 'PASS', playerId: 'p1' }).state;
  return applyAction(s, { type: 'PASS', playerId: 'p2' }).state;
};

describe('greenhouse', () => {
  const withGreenhouse = () => makeState({ rooms: ['quarters', 'greenhouse', 'engine', 'pumps', 'bridge', 'escape_pod', 'life_support'] });

  it('makes oxygen every round once discovered and with power', () => {
    const s = withGreenhouse();
    s.rooms.r1.discovered = true;
    s.systems.power.repaired = true;
    const used = 4 + 2 * 2;
    expect(passRound(s).oxygen).toBe(100 - used + BALANCE.rooms.greenhouseOxygen);
  });

  it('does nothing without power or before anyone finds it', () => {
    const dark = withGreenhouse();
    dark.rooms.r1.discovered = true;
    expect(passRound(dark).oxygen).toBe(100 - 8);

    const unknown = withGreenhouse();
    unknown.systems.power.repaired = true;
    expect(passRound(unknown).oxygen).toBe(100 - 8);
  });
});

describe('laboratory', () => {
  const inLab = () => {
    const s = makeState({ rooms: ['lab', 'engine', 'pumps', 'bridge', 'escape_pod', 'life_support'] });
    return s;
  };

  it('a successful craft gives the chosen item and costs two actions', () => {
    const { state, events } = applyAction(nextRoll(inLab(), 5), { type: 'CRAFT', playerId: 'p1', item: 'oxygen_tank' });
    expect(state.players[0].inventory).toEqual(['oxygen_tank']);
    expect(state.labCrafts).toBe(1);
    expect(state.actionsLeft).toBe(BALANCE.actionsPerTurn - BALANCE.rooms.craft.cost);
    expect(events).toContainEqual({ type: 'ItemCrafted', playerId: 'p1', item: 'oxygen_tank' });
  });

  it('a failed roll uses the actions but not the materials', () => {
    const { state } = applyAction(nextRoll(inLab(), 1), { type: 'CRAFT', playerId: 'p1', item: 'medkit' });
    expect(state.players[0].inventory).toEqual([]);
    expect(state.labCrafts).toBe(0);
    expect(state.actionsLeft).toBe(BALANCE.actionsPerTurn - BALANCE.rooms.craft.cost);
  });

  it('runs out of materials, needs enough actions and only works in the lab', () => {
    const empty = inLab();
    empty.labCrafts = BALANCE.rooms.craft.maxPerGame;
    expect(applyAction(empty, { type: 'CRAFT', playerId: 'p1', item: 'medkit' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'En el laboratorio ya no quedan materiales.',
    });

    const tired = inLab();
    tired.actionsLeft = 1;
    expect(applyAction(tired, { type: 'CRAFT', playerId: 'p1', item: 'medkit' }).events[0].type).toBe('ActionRejected');

    expect(applyAction(makeState(), { type: 'CRAFT', playerId: 'p1', item: 'medkit' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'Hay que estar en el laboratorio.',
    });
  });
});

describe('cantina', () => {
  const inCantina = () => makeState({ rooms: ['cantina', 'engine', 'pumps', 'bridge', 'escape_pod', 'life_support'] });

  it('eating and resting gives a life back, once per crew member', () => {
    const s = inCantina();
    s.players[0].health = 1;
    const { state } = applyAction(s, { type: 'REST', playerId: 'p1' });
    expect(state.players[0].health).toBe(1 + BALANCE.rooms.restHeal);
    expect(state.players[0].rested).toBe(true);
    expect(applyAction(state, { type: 'REST', playerId: 'p1' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'Ya has comido y descansado en esta partida.',
    });
  });

  it('is not allowed at full health', () => {
    expect(applyAction(inCantina(), { type: 'REST', playerId: 'p1' }).events[0]).toEqual({
      type: 'ActionRejected',
      reason: 'Ya tienes todas tus vidas.',
    });
  });
});
