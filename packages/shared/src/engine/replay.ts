// Rebuilds a finished game from its setup and the list of actions taken.
// The engine is deterministic, so the same inputs always give the same final
// state: a score can be checked by replaying it (e.g. by a future server).

import { applyAction } from './applyAction';
import { createGame, type NewGame } from './setup';
import type { Action, GameState } from './types';

export function replay(game: NewGame, actions: Action[]): GameState {
  let state = createGame(game).state;
  actions.forEach((action, i) => {
    const result = applyAction(state, action);
    const rejected = result.events.find((e) => e.type === 'ActionRejected');
    if (rejected) throw new Error(`Action ${i} (${action.type}) was rejected: ${rejected.type === 'ActionRejected' ? rejected.reason : ''}`);
    state = result.state;
  });
  return state;
}
