import { BALL, PLAYER } from '../config';
import { dist2, flat, len2, norm2, sub2 } from '../math';
import type { AABB } from '../nav/grid';
import {
  BallState,
  KeuleState,
  PlayerLifeState,
  otherTeam,
  type KeuleEntity,
  type PlayerState,
  type Vec2,
} from '../types';
import type { GameState } from '../sim/state';

/** 2D segment vs axis-aligned box intersection (slab method). */
export function segmentIntersectsAABB(a: Vec2, b: Vec2, box: AABB): boolean {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let tmin = 0;
  let tmax = 1;
  // x slab
  if (Math.abs(dx) < 1e-8) {
    if (a.x < box.minX || a.x > box.maxX) return false;
  } else {
    let t1 = (box.minX - a.x) / dx;
    let t2 = (box.maxX - a.x) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  // z slab
  if (Math.abs(dz) < 1e-8) {
    if (a.z < box.minZ || a.z > box.maxZ) return false;
  } else {
    let t1 = (box.minZ - a.z) / dz;
    let t2 = (box.maxZ - a.z) / dz;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function hasLineOfSight(from: Vec2, to: Vec2, blockers: AABB[]): boolean {
  for (const b of blockers) {
    if (segmentIntersectsAABB(from, to, b)) return false;
  }
  return true;
}

export interface VisibleEnemy {
  player: PlayerState;
  dist: number;
  los: boolean;
}

export interface IncomingThreat {
  ballId: string;
  pos: Vec2;
  vel: Vec2;
  /** Perpendicular miss distance to self along the ball's path. */
  miss: number;
  dist: number;
}

export interface Perception {
  self: PlayerState;
  teammates: PlayerState[];
  enemies: VisibleEnemy[];
  nearestEnemy: PlayerState | null;
  nearestVisibleEnemy: VisibleEnemy | null;
  threat: IncomingThreat | null;
  nearestBallId: string | null;
  nearestBallPos: Vec2 | null;
  ownKeule: KeuleEntity;
  enemyKeule: KeuleEntity;
  /** An enemy currently carrying our Keule (to intercept). */
  enemyCarrier: PlayerState | null;
  /** A teammate carrying the enemy Keule (to escort). */
  friendlyCarrier: PlayerState | null;
}

/** Build a bot's view of the world for this decision. */
export function perceive(state: GameState, self: PlayerState, losBlockers: AABB[]): Perception {
  const selfPos = flat(self.position);
  const teammates: PlayerState[] = [];
  const enemies: VisibleEnemy[] = [];
  let nearestEnemy: PlayerState | null = null;
  let nearestEnemyDist = Infinity;
  let nearestVisibleEnemy: VisibleEnemy | null = null;
  let nearestVisibleDist = Infinity;

  for (const p of Object.values(state.players)) {
    if (p.id === self.id) continue;
    if (p.team === self.team) {
      if (p.life === PlayerLifeState.Alive) teammates.push(p);
      continue;
    }
    if (p.life !== PlayerLifeState.Alive) continue;
    const d = dist2(selfPos, flat(p.position));
    const los = hasLineOfSight(selfPos, flat(p.position), losBlockers);
    enemies.push({ player: p, dist: d, los });
    if (d < nearestEnemyDist) {
      nearestEnemyDist = d;
      nearestEnemy = p;
    }
    if (los && d < nearestVisibleDist) {
      nearestVisibleDist = d;
      nearestVisibleEnemy = { player: p, dist: d, los };
    }
  }
  enemies.sort((a, b) => a.dist - b.dist);

  // incoming threats: enemy-thrown balls heading roughly at us
  let threat: IncomingThreat | null = null;
  let bestThreat = Infinity;
  for (const ball of Object.values(state.balls)) {
    if (ball.state !== BallState.Thrown) continue;
    if (ball.lastThrownTeam === self.team) continue;
    if (ball.speed < BALL.hitSpeedThreshold * 0.7) continue;
    const bp = flat(ball.position);
    const bv: Vec2 = { x: ball.velocity.x, z: ball.velocity.z };
    const toSelf = sub2(selfPos, bp);
    const dist = len2(toSelf);
    if (dist > 12) continue;
    const dir = norm2(bv);
    // project self onto ball path; miss = perpendicular distance
    const along = toSelf.x * dir.x + toSelf.z * dir.z;
    if (along < 0) continue; // moving away
    const closest: Vec2 = { x: bp.x + dir.x * along, z: bp.z + dir.z * along };
    const miss = dist2(selfPos, closest);
    if (miss < PLAYER.radius + 0.9 && dist < bestThreat) {
      bestThreat = dist;
      threat = { ballId: ball.id, pos: bp, vel: bv, miss, dist };
    }
  }

  // nearest idle pickup
  let nearestBallId: string | null = null;
  let nearestBallPos: Vec2 | null = null;
  let nearestBallDist = Infinity;
  for (const ball of Object.values(state.balls)) {
    if (ball.state !== BallState.Idle) continue;
    const d = dist2(selfPos, flat(ball.position));
    if (d < nearestBallDist) {
      nearestBallDist = d;
      nearestBallId = ball.id;
      nearestBallPos = flat(ball.position);
    }
  }

  const ownKeule = state.keules[self.team];
  const enemyKeule = state.keules[otherTeam(self.team)];

  let enemyCarrier: PlayerState | null = null;
  if (ownKeule.state === KeuleState.Carried && ownKeule.carrier) {
    enemyCarrier = state.players[ownKeule.carrier] ?? null;
  }
  let friendlyCarrier: PlayerState | null = null;
  if (enemyKeule.state === KeuleState.Carried && enemyKeule.carrier) {
    const c = state.players[enemyKeule.carrier];
    if (c && c.id !== self.id) friendlyCarrier = c;
  }

  return {
    self,
    teammates,
    enemies,
    nearestEnemy,
    nearestVisibleEnemy,
    threat,
    nearestBallId,
    nearestBallPos,
    ownKeule,
    enemyKeule,
    enemyCarrier,
    friendlyCarrier,
  };
}
