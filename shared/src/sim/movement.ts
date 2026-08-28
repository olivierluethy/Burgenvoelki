import { PLAYER } from '../config';
import { clamp, len2, norm2, v2 } from '../math';
import type { Vec2 } from '../types';
import type { PlayerInput } from './input';

/**
 * Movement resolution — pure, deterministic, and identical on client and
 * server. Produces the desired planar velocity + facing for a player from their
 * input. The physics engine applies the velocity and resolves collisions; this
 * module owns the *rules* (speed, sprint, carry slow-down, dodge-dash).
 */

export interface MovementController {
  /** Seconds left in an active dash (0 = not dashing). */
  dashTimeLeft: number;
  /** Seconds left before another dash is allowed. */
  dashCooldownLeft: number;
  /** Locked dash direction while dashing. */
  dashDir: Vec2;
  /** Current facing (persists when the player stops moving/aiming). */
  facing: Vec2;
}

export function createMovementController(facing: Vec2 = { x: 1, z: 0 }): MovementController {
  return { dashTimeLeft: 0, dashCooldownLeft: 0, dashDir: { x: 0, z: 0 }, facing };
}

export interface MoveResult {
  /** Target planar velocity (m/s) to feed the physics body. */
  velocity: Vec2;
  facing: Vec2;
  isDashing: boolean;
  startedDash: boolean;
}

export interface MoveOptions {
  carrying: boolean;
  /** Alive players move; OUT players are frozen. */
  canMove: boolean;
}

export function stepMovement(
  ctrl: MovementController,
  input: PlayerInput,
  opts: MoveOptions,
  dt: number,
): MoveResult {
  // timers
  ctrl.dashCooldownLeft = Math.max(0, ctrl.dashCooldownLeft - dt);
  ctrl.dashTimeLeft = Math.max(0, ctrl.dashTimeLeft - dt);

  // facing follows aim when present
  if (len2(input.aim) > 0.01) ctrl.facing = norm2(input.aim);

  if (!opts.canMove) {
    return { velocity: v2(0, 0), facing: ctrl.facing, isDashing: false, startedDash: false };
  }

  const moveDir = len2(input.move) > 0.01 ? norm2(input.move) : v2(0, 0);

  // start a dash on rising edge if off cooldown
  let startedDash = false;
  if (input.dash && ctrl.dashCooldownLeft <= 0 && ctrl.dashTimeLeft <= 0) {
    const dir = len2(moveDir) > 0.01 ? moveDir : ctrl.facing;
    ctrl.dashDir = norm2(dir);
    ctrl.dashTimeLeft = PLAYER.dashDurationSec;
    ctrl.dashCooldownLeft = PLAYER.dashCooldownSec;
    startedDash = true;
  }

  if (ctrl.dashTimeLeft > 0) {
    return {
      velocity: { x: ctrl.dashDir.x * PLAYER.dashSpeed, z: ctrl.dashDir.z * PLAYER.dashSpeed },
      facing: ctrl.facing,
      isDashing: true,
      startedDash,
    };
  }

  let speed = input.sprint ? PLAYER.sprintSpeed : PLAYER.moveSpeed;
  if (opts.carrying) speed *= PLAYER.carrySpeedFactor;

  return {
    velocity: { x: moveDir.x * speed, z: moveDir.z * speed },
    facing: ctrl.facing,
    isDashing: false,
    startedDash,
  };
}

/** Keep a planar position inside the playable rectangle (used as a soft clamp). */
export function clampToPlayable(
  pos: Vec2,
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number },
): Vec2 {
  return {
    x: clamp(pos.x, bounds.xMin, bounds.xMax),
    z: clamp(pos.z, bounds.zMin, bounds.zMax),
  };
}
