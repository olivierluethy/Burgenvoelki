import type { Difficulty } from '../types';

/** Client → server and server → client message names. */
export const NET_MSG = {
  input: 'input',
  events: 'events',
  ready: 'ready',
  start: 'start',
  settings: 'settings',
  addBots: 'addBots',
  reassign: 'reassign',
} as const;

/** Room creation / configuration options (owner-editable in the lobby). */
export interface RoomSettings {
  teamSize: number;
  rounds: number;
  roundDurationSec: number;
  respawnSec: number;
  preparationSec: number;
  friendlyFire: boolean;
  /** Difficulty for bots filling empty slots. */
  botDifficulty: Difficulty;
  map: string;
  isPrivate: boolean;
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  teamSize: 3,
  rounds: 3,
  roundDurationSec: 180,
  respawnSec: 6,
  preparationSec: 20,
  friendlyFire: false,
  botDifficulty: 'normal' as Difficulty,
  map: 'sporthalle',
  isPrivate: false,
};

/** A 5-char join code like K7X4P. */
export function makeRoomCode(rng: () => number = Math.random): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += alphabet[Math.floor(rng() * alphabet.length)];
  return code;
}
