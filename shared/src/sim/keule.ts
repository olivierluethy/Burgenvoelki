import { ARENA, KEULE, PLAYABLE } from '../config';
import { dist2 } from '../math';
import { isReachable } from '../nav/astar';
import { isWalkableWorld, type NavGrid } from '../nav/grid';
import {
  KeuleState,
  MatchPhase,
  Team,
  type PlayerState,
  type Vec2,
  type Vec3,
} from '../types';
import type { GameState } from './state';

export type KeuleRejectReason = 'OUT_OF_BOUNDS' | 'OUTSIDE_ZONE' | 'EMBEDDED' | 'UNREACHABLE';

export interface PlacementResult {
  ok: boolean;
  reason?: KeuleRejectReason;
}

/** Is a floor point inside the team's own Keule zone? */
export function inOwnKeuleZone(team: Team, x: number, z: number): boolean {
  const [x0, x1] = ARENA.keuleZoneX[team];
  const inX = x >= x0 && x <= x1;
  const inZ = z >= PLAYABLE.zMin && z <= PLAYABLE.zMax;
  return inX && inZ;
}

/** A representative point deep in the opponent's playable half. */
function opponentAnchor(team: Team): Vec2 {
  return { x: team === Team.Blue ? PLAYABLE.xMax - 1 : PLAYABLE.xMin + 1, z: 0 };
}

/**
 * Server-style Keule placement validation (plan M3): inside the playable area,
 * inside the owner's Keule zone, not embedded in geometry, and A*-reachable from
 * the opponent's playable area over the nav grid — otherwise rejected.
 */
export function validateKeulePlacement(
  team: Team,
  pos: Vec3,
  grid: NavGrid,
): PlacementResult {
  if (pos.x < PLAYABLE.xMin || pos.x > PLAYABLE.xMax || pos.z < PLAYABLE.zMin || pos.z > PLAYABLE.zMax) {
    return { ok: false, reason: 'OUT_OF_BOUNDS' };
  }
  if (!inOwnKeuleZone(team, pos.x, pos.z)) {
    return { ok: false, reason: 'OUTSIDE_ZONE' };
  }
  if (!isWalkableWorld(grid, pos.x, pos.z)) {
    return { ok: false, reason: 'EMBEDDED' };
  }
  if (!isReachable(grid, opponentAnchor(team), { x: pos.x, z: pos.z })) {
    return { ok: false, reason: 'UNREACHABLE' };
  }
  return { ok: true };
}

/**
 * Which Keule (by owning team) a player may grab right now, or null. Depends on
 * phase: during preparation you reposition your OWN Keule; during the match you
 * steal the ENEMY Keule, or recover your OWN if it was dropped.
 */
export function grabbableKeule(state: GameState, p: PlayerState): Team | null {
  let best: Team | null = null;
  let bestD: number = KEULE.grabRadius;
  for (const team of [Team.Blue, Team.Red] as Team[]) {
    const k = state.keules[team];
    if (k.carrier) continue;
    const eligible =
      state.phase === MatchPhase.Preparation
        ? k.team === p.team // reposition own
        : k.team !== p.team // steal enemy
          ? k.state === KeuleState.Safe || k.state === KeuleState.Dropped
          : k.state === KeuleState.Dropped; // recover own if dropped
    if (!eligible) continue;
    const d = dist2({ x: p.position.x, z: p.position.z }, { x: k.position.x, z: k.position.z });
    if (d < bestD) {
      bestD = d;
      best = team;
    }
  }
  return best;
}

/** Has a carrier taken the enemy Keule across their own scoring line? */
export function isCaptureCrossing(carrier: PlayerState, keuleTeam: Team): boolean {
  if (keuleTeam === carrier.team) return false; // must be the enemy Keule
  const line = ARENA.scoreLineX[carrier.team];
  return carrier.team === Team.Blue ? carrier.position.x <= line : carrier.position.x >= line;
}

/** Has a defender brought their OWN dropped Keule back into its zone? */
export function isReturnCrossing(carrier: PlayerState, keuleTeam: Team): boolean {
  if (keuleTeam !== carrier.team) return false;
  return inOwnKeuleZone(carrier.team, carrier.position.x, carrier.position.z);
}
