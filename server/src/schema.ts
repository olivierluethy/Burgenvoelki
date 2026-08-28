import { Schema, MapSchema, defineTypes } from '@colyseus/schema';

/**
 * Networked room state. Uses the non-decorator defineTypes API so no special TS
 * decorator config is needed. Colyseus computes and sends only deltas, so we
 * mutate these in place each tick rather than blasting full state.
 */

export class PlayerNet extends Schema {
  id = '';
  sessionId = '';
  name = '';
  team = '';
  controller = 'bot';
  life = 'alive';
  x = 0;
  y = 0;
  z = 0;
  aimX = 1;
  aimZ = 0;
  heldBall = '';
  carrying = false;
  charge = 0;
  respawnIn = 0;
  level = 1;
  ready = false;
  // stats
  hits = 0;
  deaths = 0;
  captures = 0;
  keuleReturns = 0;
  keulePickups = 0;
}
defineTypes(PlayerNet, {
  id: 'string',
  sessionId: 'string',
  name: 'string',
  team: 'string',
  controller: 'string',
  life: 'string',
  x: 'number',
  y: 'number',
  z: 'number',
  aimX: 'number',
  aimZ: 'number',
  heldBall: 'string',
  carrying: 'boolean',
  charge: 'number',
  respawnIn: 'number',
  level: 'number',
  ready: 'boolean',
  hits: 'number',
  deaths: 'number',
  captures: 'number',
  keuleReturns: 'number',
  keulePickups: 'number',
});

export class BallNet extends Schema {
  id = '';
  state = 'idle';
  x = 0;
  y = 0;
  z = 0;
  holder = '';
}
defineTypes(BallNet, {
  id: 'string',
  state: 'string',
  x: 'number',
  y: 'number',
  z: 'number',
  holder: 'string',
});

export class KeuleNet extends Schema {
  team = '';
  state = 'SAFE';
  x = 0;
  y = 0;
  z = 0;
  carrier = '';
}
defineTypes(KeuleNet, {
  team: 'string',
  state: 'string',
  x: 'number',
  y: 'number',
  z: 'number',
  carrier: 'string',
});

export class ArenaState extends Schema {
  code = '';
  ownerSessionId = '';
  started = false;
  phase = 'LOBBY';
  round = 1;
  phaseTimer = 0;
  scoreBlue = 0;
  scoreRed = 0;
  lastRoundWinner = '';
  lastRoundReason = '';
  matchWinner = '';
  mvpId = '';
  mvpReason = '';
  // settings mirror (for the lobby)
  teamSize = 3;
  rounds = 3;
  roundDurationSec = 180;
  friendlyFire = false;
  botDifficulty = 'normal';
  players = new MapSchema<PlayerNet>();
  balls = new MapSchema<BallNet>();
  keules = new MapSchema<KeuleNet>();
}
defineTypes(ArenaState, {
  code: 'string',
  ownerSessionId: 'string',
  started: 'boolean',
  phase: 'string',
  round: 'number',
  phaseTimer: 'number',
  scoreBlue: 'number',
  scoreRed: 'number',
  lastRoundWinner: 'string',
  lastRoundReason: 'string',
  matchWinner: 'string',
  mvpId: 'string',
  mvpReason: 'string',
  teamSize: 'number',
  rounds: 'number',
  roundDurationSec: 'number',
  friendlyFire: 'boolean',
  botDifficulty: 'string',
  players: { map: PlayerNet },
  balls: { map: BallNet },
  keules: { map: KeuleNet },
});
