// A game session: where the authoritative GameState lives and where actions go.
//
// The client never calls the rules engine directly; it talks to a Session.
// LocalSession (hot-seat, with computer-controlled crew) runs the engine in the
// browser. A RemoteSession (phase 2) will send the same actions to the server
// over a WebSocket and receive the same results, so App doesn't change.

import { createBotMemory, decide, observe } from '@afloat/shared/ai/bot';
import { applyAction, createGame, type Action, type ActionResult, type GameEvent, type GameState, type NewGame } from '@afloat/shared/engine';

export interface Session {
  readonly setup: NewGame;
  /** Authoritative state after the last accepted action. */
  readonly state: GameState;
  /** Events produced when the game was created (round 1 crisis). */
  readonly startEvents: GameEvent[];
  /** Every accepted action, in order: with `setup`, enough to replay the game. */
  readonly actions: readonly Action[];
  /** Sends an action. A rejection comes back as an `ActionRejected` event and changes nothing. */
  submit(action: Action): Promise<ActionResult>;
  /**
   * The next action for the active computer-controlled crew member. Only local
   * sessions provide it; online, the server plays the bots.
   */
  botAction?(): Action;
}

export class LocalSession implements Session {
  readonly startEvents: GameEvent[];
  private current: GameState;
  private readonly log: Action[] = [];
  private readonly botMemory = createBotMemory();

  constructor(readonly setup: NewGame) {
    const { state, events } = createGame(setup);
    this.current = state;
    this.startEvents = events;
  }

  get state() {
    return this.current;
  }

  get actions() {
    return this.log;
  }

  async submit(action: Action): Promise<ActionResult> {
    const before = this.current;
    const result = applyAction(before, action);
    if (result.events[0]?.type === 'ActionRejected') return result;
    this.current = result.state;
    this.log.push(action);
    observe(this.botMemory, before, result.events);
    return result;
  }

  botAction() {
    return decide(this.current, this.botMemory);
  }
}
