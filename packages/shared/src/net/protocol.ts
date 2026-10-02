// Messages between the browser and the online room server (phase 2), and the
// room as both sides see it. Pure types and constants: no network code here.

import type { Difficulty } from '../content/difficulty';
import type { RoleId } from '../content/roles';
import type { Action, GameEvent, GameState, NewGame } from '../engine';

/** Room codes: no 0/O or 1/I/L, so they can be read out loud and typed without mistakes. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const MAX_NAME_LENGTH = 20;
/** Messages bigger than this are dropped. */
export const MAX_MESSAGE_BYTES = 64 * 1024;

export const isRoomCode = (code: string) =>
  code.length === ROOM_CODE_LENGTH && [...code].every((c) => ROOM_CODE_ALPHABET.includes(c));

/** Upper-cases and trims what someone typed as a code. */
export const normalizeRoomCode = (text: string) => text.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Trims a player name to the allowed length; empty means invalid. */
export const cleanName = (name: string) => name.replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LENGTH);

export type RoomPhase = 'lobby' | 'playing' | 'ended';

export interface SeatView {
  name: string;
  role: RoleId | null;
  /** Computer-controlled from the start. */
  bot: boolean;
  /** Human player with an open connection (always true for bots). */
  connected: boolean;
  host: boolean;
  /** Human player whose turns the computer is playing while they are away. */
  takenOver: boolean;
}

export interface RoomView {
  code: string;
  phase: RoomPhase;
  difficulty: Difficulty;
  /** In play order: seat i is player `players[i]` once the game starts. */
  seats: SeatView[];
}

export type ClientMessage =
  | { type: 'hello'; key: string; name: string }
  | { type: 'rename'; name: string }
  | { type: 'pick'; role: RoleId }
  | { type: 'setDifficulty'; difficulty: Difficulty }
  | { type: 'addBot'; role: RoleId }
  | { type: 'removeBot'; seat: number }
  | { type: 'start' }
  | { type: 'action'; action: Action }
  | { type: 'botTakeover'; seat: number }
  | { type: 'rematch' }
  | { type: 'resync' }
  | { type: 'leave' };

export type RoomErrorCode = 'not_found' | 'full' | 'in_progress' | 'bad_request';

export type ServerMessage =
  /** The room changed. `you` is the receiver's seat (null before joining). */
  | { type: 'room'; room: RoomView; you: number | null }
  | { type: 'started'; setup: NewGame; state: GameState; startEvents: GameEvent[]; seq: number }
  /** An accepted action, from anyone (computer included). `seq` counts them from 1. */
  | { type: 'result'; seq: number; action: Action; events: GameEvent[]; state: GameState }
  /** The whole game, after reconnecting or when a result went missing. */
  | { type: 'snapshot'; setup: NewGame; state: GameState; actions: Action[]; seq: number }
  /** Your action was not accepted (the reason is ready to show). */
  | { type: 'rejected'; reason: string }
  | { type: 'error'; code: RoomErrorCode };
