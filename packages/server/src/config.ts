// Server timings. Not rules of the game (those live in BALANCE): only how the
// room paces the computer's turns and when an empty room is cleaned up.

export const SERVER = {
  /** Pause before each computer action, so players can follow it... */
  botPauseMs: 900,
  /** ...plus this much for every event the clients have to animate... */
  botPausePerEventMs: 450,
  /** ...up to this. */
  botPauseMaxMs: 6000,
  /** A room nobody is connected to is deleted after this long. */
  emptyRoomTtlMs: 24 * 60 * 60 * 1000,
  /** Attempts to find a free room code. */
  codeAttempts: 8,
};
