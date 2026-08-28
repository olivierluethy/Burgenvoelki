import { ARENA, BALL, PLAYABLE, type DifficultyProfile } from '../config';
import { clamp, dist2, flat, gauss, len2, norm2, rot2, sub2, v2 } from '../math';
import { findPath } from '../nav/astar';
import type { AABB, NavGrid } from '../nav/grid';
import { AIState, KeuleState, PlayerLifeState, Team, type PlayerState, type Vec2 } from '../types';
import { neutralInput, type PlayerInput } from '../sim/input';
import type { GameState } from '../sim/state';
import type { CoverPoint } from '../arena/props';
import { perceive, type Perception } from './perception';

const THROW_RANGE = 11;
const PREFERRED_RANGE = 7.5;
const WAYPOINT_REACH = 0.55;

/** Persistent per-bot AI memory across ticks. */
export interface AIController {
  state: AIState;
  decisionTimer: number;
  reactionTimer: number;
  repathTimer: number;
  path: Vec2[];
  pathIdx: number;
  goal: Vec2 | null;
  targetId: string | null;
  chargeTarget: number;
  wanderTarget: Vec2 | null;
}

export function createAIController(): AIController {
  return {
    state: AIState.Idle,
    decisionTimer: 0,
    reactionTimer: 0,
    repathTimer: 0,
    path: [],
    pathIdx: 0,
    goal: null,
    targetId: null,
    chargeTarget: 0.6,
    wanderTarget: null,
  };
}

export interface AIContext {
  grid: NavGrid;
  losBlockers: AABB[];
  cover: CoverPoint[];
  profile: DifficultyProfile;
  rng: () => number;
}

/** Advance one bot: perceive, (re)decide, steer and act. Returns its input. */
export function stepAI(
  state: GameState,
  self: PlayerState,
  ctrl: AIController,
  ctx: AIContext,
  dt: number,
): PlayerInput {
  ctrl.decisionTimer -= dt;
  ctrl.reactionTimer -= dt;
  ctrl.repathTimer -= dt;

  const p = perceive(state, self, ctx.losBlockers);
  const input = neutralInput();
  input.aim = { ...self.aim };

  if (ctrl.decisionTimer <= 0) {
    decide(p, ctrl, ctx);
    ctrl.decisionTimer = ctx.profile.decisionInterval;
  }

  const selfPos = flat(self.position);
  const goal = goalFor(state, p, ctrl, ctx);
  ctrl.goal = goal;

  // --- steering along an A* path ---
  let moveDir: Vec2 = v2(0, 0);
  if (goal) {
    if (ctrl.path.length === 0 || ctrl.repathTimer <= 0) {
      const path = findPath(ctx.grid, selfPos, goal);
      ctrl.path = path ?? [goal];
      ctrl.pathIdx = 0;
      ctrl.repathTimer = 0.35 + ctx.rng() * 0.2;
    }
    while (ctrl.pathIdx < ctrl.path.length - 1 && dist2(selfPos, ctrl.path[ctrl.pathIdx]) < WAYPOINT_REACH) {
      ctrl.pathIdx++;
    }
    const wp = ctrl.path[Math.min(ctrl.pathIdx, ctrl.path.length - 1)];
    const toWp = sub2(wp, selfPos);
    if (len2(toWp) > 0.15) moveDir = norm2(toWp);
  }

  const hasBall = !!self.heldBall;

  // default aim toward movement / nearest enemy
  if (len2(moveDir) > 0.01) input.aim = moveDir;
  if (p.nearestEnemy) input.aim = norm2(sub2(flat(p.nearestEnemy.position), selfPos));

  if (ctrl.state === AIState.Attack || ctrl.state === AIState.Defend) {
    const t = ctrl.targetId ? state.players[ctrl.targetId] : null;
    const foe = t && t.life === PlayerLifeState.Alive ? t : p.nearestVisibleEnemy?.player ?? p.nearestEnemy;
    if (foe) {
      const foePos = flat(foe.position);
      const d = dist2(selfPos, foePos);
      input.aim = leadAim(selfPos, foe, ctx.profile, ctx.rng);
      if (hasBall && d < THROW_RANGE) {
        if (d < PREFERRED_RANGE) moveDir = v2(0, 0);
        input.throwHeld = true;
        if (self.throwCharge >= ctrl.chargeTarget && ctrl.reactionTimer <= 0) {
          if (ctx.rng() < ctx.profile.throwFollowThrough) input.throwRelease = true;
        }
      }
    }
  } else if (ctrl.state === AIState.SeekCover && p.nearestEnemy) {
    input.aim = norm2(sub2(flat(p.nearestEnemy.position), selfPos));
  }

  // pick up a ball we walk near, or grab the objective Keule
  if (!hasBall && p.nearestBallPos && dist2(selfPos, p.nearestBallPos) < 1.0) {
    input.interact = true;
  }
  if (ctrl.state === AIState.CaptureKeule && dist2(selfPos, flat(p.enemyKeule.position)) < 1.0) {
    input.interact = true;
  }
  if (
    ctrl.state === AIState.ReturnKeule &&
    p.ownKeule.state === KeuleState.Dropped &&
    dist2(selfPos, flat(p.ownKeule.position)) < 1.0
  ) {
    input.interact = true;
  }

  // dodge an incoming ball with a dash (better bots dodge more)
  if (p.threat && !self.carryingKeule && ctx.rng() < ctx.profile.coverUse * 0.5) {
    const perp = rot2(norm2(p.threat.vel), Math.PI / 2);
    const side = ctx.rng() < 0.5 ? 1 : -1;
    moveDir = { x: perp.x * side, z: perp.z * side };
    input.dash = true;
  }

  input.move = moveDir;
  input.sprint =
    (ctrl.state === AIState.ReturnKeule ||
      ctrl.state === AIState.CaptureKeule ||
      ctrl.state === AIState.Defend) &&
    !self.carryingKeule;
  return input;
}

function leadAim(selfPos: Vec2, foe: PlayerState, profile: DifficultyProfile, rng: () => number): Vec2 {
  const foePos = flat(foe.position);
  const d = Math.hypot(foePos.x - selfPos.x, foePos.z - selfPos.z);
  const travel = d / BALL.throwSpeedMax;
  const predicted: Vec2 = {
    x: foePos.x + foe.velocity.x * travel * profile.leadPrediction,
    z: foePos.z + foe.velocity.z * travel * profile.leadPrediction,
  };
  const dir = norm2(sub2(predicted, selfPos));
  return rot2(dir, gauss(rng) * profile.aimError);
}

/** Utility-scored FSM: choose the behaviour with the highest score. */
function decide(p: Perception, ctrl: AIController, ctx: AIContext): void {
  const self = p.self;
  const prof = ctx.profile;
  const hasBall = !!self.heldBall;

  // carrying the enemy Keule overrides everything: run it home
  if (self.carryingKeule) {
    setState(ctrl, AIState.ReturnKeule, null);
    return;
  }

  const jitter = () => (ctx.rng() - 0.5) * 0.1;
  const scores: { state: AIState; score: number; target: string | null }[] = [];

  if (p.enemyCarrier) {
    scores.push({
      state: AIState.Defend,
      score: 0.85 * (0.5 + prof.coordination) + jitter(),
      target: p.enemyCarrier.id,
    });
  }
  if (p.ownKeule.state === KeuleState.Dropped) {
    scores.push({ state: AIState.ReturnKeule, score: 0.7 + jitter(), target: null });
  }
  if (hasBall && p.nearestVisibleEnemy) {
    const closeBonus = clamp((THROW_RANGE - p.nearestVisibleEnemy.dist) / THROW_RANGE, 0, 0.3);
    scores.push({ state: AIState.Attack, score: 0.6 + closeBonus + jitter(), target: p.nearestVisibleEnemy.player.id });
  }
  if (p.enemyKeule.state !== KeuleState.Carried) {
    scores.push({ state: AIState.CaptureKeule, score: (hasBall ? 0.42 : 0.5) + jitter(), target: null });
  }
  if (!hasBall) {
    scores.push({ state: AIState.Search, score: (p.nearestBallId ? 0.55 : 0.15) + jitter(), target: null });
  }
  if (p.threat) {
    scores.push({ state: AIState.SeekCover, score: prof.coverUse * 0.75 + jitter(), target: null });
  }
  if (p.friendlyCarrier) {
    scores.push({
      state: AIState.SupportTeammate,
      score: 0.5 * (0.5 + prof.coordination) + jitter(),
      target: p.friendlyCarrier.id,
    });
  }

  if (scores.length === 0) {
    setState(ctrl, AIState.Idle, null);
    return;
  }
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  const changed = ctrl.state !== best.state || ctrl.targetId !== best.target;
  setState(ctrl, best.state, best.target);
  if (changed && (best.state === AIState.Attack || best.state === AIState.Defend)) {
    ctrl.reactionTimer = prof.reactionLatency;
    ctrl.chargeTarget = 0.55 + ctx.rng() * 0.35;
  }
}

function setState(ctrl: AIController, s: AIState, target: string | null) {
  if (ctrl.state !== s || ctrl.targetId !== target) {
    ctrl.path = [];
    ctrl.pathIdx = 0;
    ctrl.repathTimer = 0;
  }
  ctrl.state = s;
  ctrl.targetId = target;
}

/** The world-space goal point for the current state. */
function goalFor(state: GameState, p: Perception, ctrl: AIController, ctx: AIContext): Vec2 | null {
  const self = p.self;
  const selfPos = flat(self.position);

  switch (ctrl.state) {
    case AIState.ReturnKeule: {
      if (self.carryingKeule) {
        const line = ARENA.scoreLineX[self.team];
        const x = self.team === Team.Blue ? line - 1.5 : line + 1.5;
        return clampPlayable({ x, z: self.position.z });
      }
      if (p.ownKeule.state === KeuleState.Dropped) return flat(p.ownKeule.position);
      return null;
    }
    case AIState.CaptureKeule:
      return flat(p.enemyKeule.position);
    case AIState.Defend:
      return p.enemyCarrier
        ? flat(p.enemyCarrier.position)
        : p.nearestEnemy
          ? flat(p.nearestEnemy.position)
          : null;
    case AIState.Attack: {
      const foe = ctrl.targetId ? state.players[ctrl.targetId] : p.nearestEnemy;
      if (!foe) return null;
      const foePos = flat(foe.position);
      if (dist2(selfPos, foePos) <= PREFERRED_RANGE) return null; // hold and throw
      return foePos;
    }
    case AIState.Search:
      return p.nearestBallPos;
    case AIState.SeekCover:
      return bestCover(selfPos, p, ctx);
    case AIState.SupportTeammate:
      return p.friendlyCarrier ? flat(p.friendlyCarrier.position) : null;
    default:
      return wander(self, ctrl);
  }
}

function bestCover(selfPos: Vec2, p: Perception, ctx: AIContext): Vec2 | null {
  const threatPos = p.threat ? p.threat.pos : p.nearestEnemy ? flat(p.nearestEnemy.position) : null;
  if (!threatPos) return null;
  let best: Vec2 | null = null;
  let bestScore = -Infinity;
  for (const c of ctx.cover) {
    const toThreat = norm2(sub2(threatPos, c.pos));
    const facing = -(toThreat.x * c.normal.x + toThreat.z * c.normal.z); // 1 = hidden side
    const score = facing * 2 - dist2(selfPos, c.pos) * 0.15;
    if (score > bestScore) {
      bestScore = score;
      best = c.pos;
    }
  }
  return best;
}

function wander(self: PlayerState, ctrl: AIController): Vec2 | null {
  const selfPos = flat(self.position);
  if (!ctrl.wanderTarget || dist2(selfPos, ctrl.wanderTarget) < 1.2) {
    const dir = self.team === Team.Blue ? -1 : 1;
    ctrl.wanderTarget = clampPlayable({ x: dir * (3 + Math.random() * 7), z: -6 + Math.random() * 12 });
  }
  return ctrl.wanderTarget;
}

function clampPlayable(v: Vec2): Vec2 {
  return { x: clamp(v.x, PLAYABLE.xMin, PLAYABLE.xMax), z: clamp(v.z, PLAYABLE.zMin, PLAYABLE.zMax) };
}
