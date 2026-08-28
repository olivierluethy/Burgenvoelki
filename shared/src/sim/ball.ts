import { BALL, PLAYER } from '../config';
import { clamp, dist2, norm2 } from '../math';
import {
  BallState,
  PlayerLifeState,
  otherTeam,
  type BallSnapshot,
  type PlayerState,
  type Vec2,
  type Vec3,
} from '../types';
import type { GameState } from './state';

/** A fresh idle ball at a resting position. */
export function makeBall(id: string, pos: Vec3): BallSnapshot {
  return {
    id,
    state: BallState.Idle,
    position: { ...pos },
    velocity: { x: 0, y: 0, z: 0 },
    speed: 0,
    holder: null,
    lastThrownBy: null,
    lastThrownTeam: null,
  };
}

/** Spawn the initial pool of balls: a row on the centre line plus one per half. */
export function spawnInitialBalls(state: GameState, count = 6): void {
  state.balls = {};
  const y = BALL.radius + 0.02;
  const positions: Vec3[] = [
    { x: 0, y, z: -5 },
    { x: 0, y, z: 0 },
    { x: 0, y, z: 5 },
    { x: -6, y, z: -2.5 },
    { x: 6, y, z: 2.5 },
    { x: 0, y, z: 2.5 },
  ];
  for (let i = 0; i < count && i < positions.length; i++) {
    const id = `ball_${i}`;
    state.balls[id] = makeBall(id, positions[i]);
  }
}

/** Where a held ball sits relative to its holder (in front, at hand height). */
export function heldBallPosition(holder: PlayerState): Vec3 {
  const dir = norm2(holder.aim);
  return {
    x: holder.position.x + dir.x * BALL.holdForwardOffset,
    y: BALL.holdHeight,
    z: holder.position.z + dir.z * BALL.holdForwardOffset,
  };
}

export interface ThrowResult {
  release: Vec3;
  velocity: Vec3;
  power: number; // 0..1
}

/** Convert a charged aim into a release point + launch velocity (with arc). */
export function computeThrow(holder: PlayerState, charge: number): ThrowResult {
  const power = clamp(charge, 0, 1);
  const speed = BALL.throwSpeedMin + (BALL.throwSpeedMax - BALL.throwSpeedMin) * power;
  const dir: Vec2 = norm2(holder.aim);
  const release: Vec3 = {
    x: holder.position.x + dir.x * (PLAYER.radius + BALL.radius + 0.15),
    y: BALL.holdHeight,
    z: holder.position.z + dir.z * (PLAYER.radius + BALL.radius + 0.15),
  };
  const velocity: Vec3 = {
    x: dir.x * speed,
    y: speed * BALL.throwArc,
    z: dir.z * speed,
  };
  return { release, velocity, power };
}

export interface HitResult {
  ball: string;
  target: string; // player id
  by: string | null; // thrower id
  at: Vec3;
}

/**
 * Authoritative hit detection (pure). A thrown ball above the speed threshold
 * that reaches within hit range of an alive player marks a hit, respecting the
 * friendly-fire config and never hitting its own thrower during the flight.
 */
export function detectHits(state: GameState): HitResult[] {
  const hits: HitResult[] = [];
  const friendlyFire = state.config.friendlyFire;

  for (const ball of Object.values(state.balls)) {
    if (ball.state !== BallState.Thrown) continue;
    if (ball.speed < BALL.hitSpeedThreshold) continue;

    for (const p of Object.values(state.players)) {
      if (p.life !== PlayerLifeState.Alive) continue;
      if (ball.lastThrownBy && p.id === ball.lastThrownBy) continue;
      if (!friendlyFire && ball.lastThrownTeam && p.team === ball.lastThrownTeam) continue;

      // horizontal proximity within capsule footprint, and within body height
      const d = dist2({ x: ball.position.x, z: ball.position.z }, { x: p.position.x, z: p.position.z });
      const withinHeight = ball.position.y < PLAYER.height + 0.2 && ball.position.y > -0.1;
      if (d <= PLAYER.radius + PLAYER.hitRadius && withinHeight) {
        hits.push({ ball: ball.id, target: p.id, by: ball.lastThrownBy, at: { ...ball.position } });
        break; // one ball hits at most one player per tick
      }
    }
  }
  return hits;
}

/** Nearest idle ball a player may pick up, or null. */
export function nearestPickup(state: GameState, p: PlayerState, radius: number = PLAYER.pickupRadius): string | null {
  let best: string | null = null;
  let bestD = radius;
  for (const ball of Object.values(state.balls)) {
    if (ball.state !== BallState.Idle) continue;
    const d = dist2({ x: ball.position.x, z: ball.position.z }, { x: p.position.x, z: p.position.z });
    if (d < bestD) {
      bestD = d;
      best = ball.id;
    }
  }
  return best;
}

/** Utility for AI/targeting: which enemy team's Keule a player should attack. */
export function enemyKeuleOf(p: PlayerState) {
  return otherTeam(p.team);
}
