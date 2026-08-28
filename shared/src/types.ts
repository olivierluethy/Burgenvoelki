/**
 * Core domain types shared by client and (later) the authoritative server.
 * These describe the *game rules* world — deliberately free of any rendering,
 * React or physics-engine types so the exact same simulation can run headless.
 */

export type Vec3 = { x: number; y: number; z: number };
export type Vec2 = { x: number; z: number };

export type PlayerId = string;
export type BallId = string;
export type EntityId = string;

/** The two sides. `blue` is the local player's default team in singleplayer. */
export enum Team {
  Blue = 'blue',
  Red = 'red',
}

export function otherTeam(t: Team): Team {
  return t === Team.Blue ? Team.Red : Team.Blue;
}

/** High-level match lifecycle (see STYLEGUIDE §9 / plan M3). */
export enum MatchPhase {
  Lobby = 'LOBBY',
  TeamAssignment = 'TEAM_ASSIGNMENT',
  Preparation = 'PREPARATION',
  RoundStart = 'ROUND_START',
  ActiveMatch = 'ACTIVE_MATCH',
  RoundEnd = 'ROUND_END',
  Results = 'RESULTS',
  Rewards = 'REWARDS',
}

export enum PlayerLifeState {
  Alive = 'alive',
  Out = 'out',
}

export enum ControllerKind {
  Human = 'human',
  Bot = 'bot',
}

export enum Difficulty {
  Easy = 'easy',
  Normal = 'normal',
  Hard = 'hard',
  Expert = 'expert',
}

/** What a bot is currently doing — the FSM state (plan M5). */
export enum AIState {
  Idle = 'IDLE',
  Search = 'SEARCH',
  Assess = 'ASSESS',
  Attack = 'ATTACK',
  Defend = 'DEFEND',
  Retreat = 'RETREAT',
  SeekCover = 'SEEK_COVER',
  CaptureKeule = 'CAPTURE_KEULE',
  ReturnKeule = 'RETURN_KEULE',
  SupportTeammate = 'SUPPORT_TEAMMATE',
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  team: Team;
  controller: ControllerKind;
  difficulty?: Difficulty;
  life: PlayerLifeState;
  /** Floor position of the capsule centre (y = capsule mid height). */
  position: Vec3;
  /** Facing/aim direction on the floor plane, normalised. */
  aim: Vec2;
  velocity: Vec3;
  /** BallId currently held, or null. A player holds at most one ball. */
  heldBall: BallId | null;
  /** True while carrying the enemy Keule (movement slowed). */
  carryingKeule: boolean;
  /** Seconds remaining until respawn while OUT; 0 when alive. */
  respawnIn: number;
  /** Per-match tallies used for the scoreboard + MVP. */
  stats: PlayerMatchStats;
  /** Bot-only runtime AI snapshot (undefined for humans). */
  ai?: { state: AIState; targetId?: EntityId; nextDecisionIn: number };
  level: number;
}

export interface PlayerMatchStats {
  hits: number;
  deaths: number;
  captures: number; // enemy Keule carried across own line
  keulePickups: number;
  keuleReturns: number; // recovered own dropped Keule / denied captures
  throws: number;
}

export function emptyMatchStats(): PlayerMatchStats {
  return {
    hits: 0,
    deaths: 0,
    captures: 0,
    keulePickups: 0,
    keuleReturns: 0,
    throws: 0,
  };
}

export enum BallState {
  Idle = 'idle', // resting / rolling, pickable
  Held = 'held',
  Thrown = 'thrown', // in flight, can register hits above threshold
}

export interface BallSnapshot {
  id: BallId;
  state: BallState;
  position: Vec3;
  velocity: Vec3;
  speed: number;
  holder: PlayerId | null;
  /** Team of the last thrower, for friendly-fire rules and feed attribution. */
  lastThrownBy: PlayerId | null;
  lastThrownTeam: Team | null;
}

export enum KeuleState {
  Safe = 'SAFE', // resting in a valid spot
  Carried = 'CARRIED', // held by an enemy
  Dropped = 'DROPPED', // dropped after carrier was hit, recoverable
}

export interface KeuleEntity {
  /** The team that OWNS this Keule (defends it). */
  team: Team;
  state: KeuleState;
  position: Vec3;
  carrier: PlayerId | null;
  /** Home spawn used for reset between rounds. */
  home: Vec3;
}

/** Immutable-ish snapshot the AI and HUD read each tick. */
export interface WorldSnapshot {
  tick: number;
  phase: MatchPhase;
  players: Record<PlayerId, PlayerState>;
  balls: Record<BallId, BallSnapshot>;
  keules: Record<Team, KeuleEntity>;
  scores: Record<Team, number>;
}

/** Events emitted by the sim each tick, consumed by client (FX/audio/HUD). */
export type SimEvent =
  | { type: 'hit'; ball: BallId; target: PlayerId; by: PlayerId | null; at: Vec3 }
  | { type: 'out'; player: PlayerId; by: PlayerId | null }
  | { type: 'respawn'; player: PlayerId }
  | { type: 'pickup'; player: PlayerId; ball: BallId }
  | { type: 'throw'; player: PlayerId; ball: BallId; power: number }
  | { type: 'bounce'; ball: BallId; at: Vec3; speed: number; surface: 'floor' | 'wall' | 'prop' }
  | { type: 'keule-pickup'; player: PlayerId; team: Team }
  | { type: 'keule-drop'; team: Team; at: Vec3 }
  | { type: 'keule-return'; team: Team }
  | { type: 'keule-invalid'; team: Team }
  | { type: 'capture'; team: Team; by: PlayerId }
  | { type: 'round-start'; round: number }
  | { type: 'round-end'; winner: Team | null }
  | { type: 'phase'; phase: MatchPhase };

export interface MatchConfig {
  teamSize: number; // players per team (incl. human)
  difficulty: Difficulty;
  rounds: number; // rounds to win the match (best of)
  roundDurationSec: number;
  respawnSec: number;
  preparationSec: number;
  friendlyFire: boolean;
}

export const DEFAULT_MATCH_CONFIG: MatchConfig = {
  teamSize: 3,
  difficulty: Difficulty.Normal,
  rounds: 3,
  roundDurationSec: 180,
  respawnSec: 6,
  preparationSec: 20,
  friendlyFire: false,
};
