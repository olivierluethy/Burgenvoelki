/**
 * Central tunables and arena geometry. One source of truth for numbers used by
 * the simulation, physics setup and rendering. Coordinate convention:
 *   x = length of the hall  (blue defends x < 0, red defends x > 0)
 *   z = width of the hall
 *   y = up
 * Centre line at x = 0.
 */

import { Team } from './types';

export const TICK_HZ = 60;
export const TICK_DT = 1 / TICK_HZ;
/** Guard against spiral-of-death: never simulate more than this many ticks per frame. */
export const MAX_TICKS_PER_FRAME = 5;

export const ARENA = {
  /** Full length along x (metres). */
  length: 30,
  /** Full width along z (metres). */
  width: 18,
  wallHeight: 4,
  wallThickness: 0.5,
  halfLength: 15,
  halfWidth: 9,
  /** x of each team's scoring line (carry enemy Keule past it, toward own wall, to score). */
  scoreLineX: { [Team.Blue]: -11, [Team.Red]: 11 } as Record<Team, number>,
  /** Keule zone: axis-aligned box [xMin,xMax] × full playable width, per owning team. */
  keuleZoneX: {
    [Team.Blue]: [-14, -11.5],
    [Team.Red]: [11.5, 14],
  } as Record<Team, [number, number]>,
  /** Home spawn of each Keule (centre of its zone). */
  keuleHome: {
    [Team.Blue]: { x: -12.75, y: 0.5, z: 0 },
    [Team.Red]: { x: 12.75, y: 0.5, z: 0 },
  } as Record<Team, { x: number; y: number; z: number }>,
  /** Playable inset from walls for spawns / nav / placement validity. */
  playableInset: 0.8,
  /** Out-bench position (off court, along the sideline) per team. */
  benchZ: { [Team.Blue]: -11.2, [Team.Red]: 11.2 } as Record<Team, number>,
} as const;

/** Playable bounds a position must sit inside (capsule centre). */
export const PLAYABLE = {
  xMin: -ARENA.halfLength + ARENA.playableInset,
  xMax: ARENA.halfLength - ARENA.playableInset,
  zMin: -ARENA.halfWidth + ARENA.playableInset,
  zMax: ARENA.halfWidth - ARENA.playableInset,
} as const;

export const PLAYER = {
  radius: 0.42,
  height: 1.7,
  /** Capsule centre height above floor. */
  centerY: 0.85,
  moveSpeed: 5.6, // m/s
  sprintSpeed: 8.4,
  carrySpeedFactor: 0.62, // Keule carrier is slower
  accel: 55, // m/s^2 toward desired velocity
  dashSpeed: 14,
  dashDurationSec: 0.16,
  dashCooldownSec: 1.1,
  pickupRadius: 1.2, // proximity pickup range
  /** Radius around a player a thrown ball must reach to count as a hit. */
  hitRadius: 0.55,
} as const;

export const BALL = {
  radius: 0.18,
  mass: 0.35,
  restitution: 0.62,
  friction: 0.7,
  linearDamping: 0.18,
  /** Max launch speed of a fully charged throw (m/s). */
  throwSpeedMax: 22,
  throwSpeedMin: 9,
  chargeTimeSec: 0.85, // time to full charge
  /** A thrown ball only registers a hit above this speed (m/s). */
  hitSpeedThreshold: 7.5,
  /** Ball drops from "thrown" back to "idle" below this speed. */
  restSpeed: 1.6,
  /** Vertical arc assist applied to throws so they fly nicely. */
  throwArc: 0.18,
  holdForwardOffset: 0.6,
  holdHeight: 1.15,
} as const;

export const KEULE = {
  height: 0.7,
  radius: 0.16,
  carryHeight: 1.3,
  /** Distance within which a player may grab a Keule with E. */
  grabRadius: 1.1,
} as const;

export const PHYSICS = {
  gravity: { x: 0, y: -18, z: 0 }, // slightly stronger than real g for snappy arcs
} as const;

export const NAV = {
  /** Nav-grid cell size (metres). Balance of A* cost and fidelity for browser+server. */
  cellSize: 0.6,
} as const;

/** Camera rig (fixed-angle third-person follow). */
export const CAMERA = {
  /** Offset from the followed player in world space (behind + above). */
  offset: { x: 0, y: 13, z: 9.5 },
  lookAheadY: 1.0,
  followLerp: 0.12,
  fov: 42,
  shakeDefault: 0.6, // 0..1 multiplier, configurable
} as const;

/** Difficulty scales decision *quality*, never raw speed or perfect aim. */
export interface DifficultyProfile {
  /** Seconds between AI decisions (lower = sharper). */
  decisionInterval: number;
  /** Reaction latency before responding to a new threat (s). */
  reactionLatency: number;
  /** Aim error stddev in radians applied to throws. */
  aimError: number;
  /** 0..1 how well it leads moving targets. */
  leadPrediction: number;
  /** 0..1 tendency to use cover. */
  coverUse: number;
  /** 0..1 team coordination weight. */
  coordination: number;
  /** 0..1 chance to actually take a good throw when available. */
  throwFollowThrough: number;
}

export const DIFFICULTY_PROFILES: Record<string, DifficultyProfile> = {
  easy: {
    decisionInterval: 0.55,
    reactionLatency: 0.55,
    aimError: 0.26,
    leadPrediction: 0.15,
    coverUse: 0.25,
    coordination: 0.2,
    throwFollowThrough: 0.55,
  },
  normal: {
    decisionInterval: 0.38,
    reactionLatency: 0.34,
    aimError: 0.15,
    leadPrediction: 0.45,
    coverUse: 0.5,
    coordination: 0.5,
    throwFollowThrough: 0.75,
  },
  hard: {
    decisionInterval: 0.26,
    reactionLatency: 0.2,
    aimError: 0.085,
    leadPrediction: 0.72,
    coverUse: 0.72,
    coordination: 0.75,
    throwFollowThrough: 0.9,
  },
  expert: {
    decisionInterval: 0.18,
    reactionLatency: 0.12,
    aimError: 0.045,
    leadPrediction: 0.9,
    coverUse: 0.88,
    coordination: 0.92,
    throwFollowThrough: 0.97,
  },
};

/** MVP weighting — objective actions dominate raw hits; deaths hurt. */
export const MVP_WEIGHTS = {
  capture: 100,
  keuleReturn: 45,
  keulePickup: 18,
  hit: 10,
  death: -6,
  throw: 0.5,
} as const;
