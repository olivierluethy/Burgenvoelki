import {
  ARENA,
  BALL,
  DIFFICULTY_PROFILES,
  KEULE,
  PHYSICS,
  PLAYABLE,
  PLAYER,
  TICK_DT,
} from '../config';
import { clamp, len3, norm2 } from '../math';
import {
  arenaProps,
  coverPoints,
  losBlockers,
  propAABBs,
  type CoverPoint,
} from '../arena/props';
import { buildNavGrid, nearestWalkable, type AABB, type NavGrid } from '../nav/grid';
import { stepAI, createAIController, type AIContext, type AIController } from '../ai/decision';
import {
  BallState,
  ControllerKind,
  KeuleState,
  MatchPhase,
  PlayerLifeState,
  Team,
  type MatchConfig,
  type PlayerId,
  type PlayerState,
  type SimEvent,
} from '../types';
import { createMovementController, stepMovement, type MovementController } from '../sim/movement';
import { neutralInput, type PlayerInput } from '../sim/input';
import { createInitialGameState, type GameState } from '../sim/state';
import { computeThrow, detectHits, heldBallPosition, nearestPickup } from '../sim/ball';
import { grabbableKeule, isCaptureCrossing, isReturnCrossing, validateKeulePlacement } from '../sim/keule';
import { afterRoundEnd, endRound, timeExpiryWinner } from '../sim/match';

/**
 * Authoritative, Rapier-free simulation. It runs the identical shared rules the
 * client uses (movement, ball, Keule, match, AI) on top of a small deterministic
 * integrator, so the Colyseus server can advance the exact same game headlessly
 * at the fixed tick. The client's singleplayer path keeps its richer Rapier
 * physics; this is the shared authority for multiplayer.
 */
export class HeadlessMatch {
  state: GameState;
  readonly navGrid: NavGrid;
  private readonly obstacles: AABB[];
  private readonly losers: AABB[];
  private readonly cover: CoverPoint[];
  private controllers = new Map<PlayerId, MovementController>();
  private ai = new Map<PlayerId, AIController>();
  private events: SimEvent[] = [];
  private rng: () => number;

  constructor(config: MatchConfig, rng: () => number = Math.random) {
    this.state = createInitialGameState(config);
    this.obstacles = propAABBs(arenaProps());
    this.losers = losBlockers(arenaProps());
    this.cover = coverPoints(arenaProps());
    this.navGrid = buildNavGrid(this.obstacles);
    this.rng = rng;
    for (const p of Object.values(this.state.players)) {
      const w = nearestWalkable(this.navGrid, p.position.x, p.position.z);
      p.position.x = w.x;
      p.position.z = w.z;
      p.spawn = { x: w.x, y: p.spawn.y, z: w.z };
      this.controllers.set(p.id, createMovementController({ ...p.aim }));
      if (p.controller === ControllerKind.Bot) this.ai.set(p.id, createAIController());
    }
  }

  /** Assign a seat to a human or a bot (server maps clients to seats at start). */
  assignSeat(playerId: PlayerId, kind: ControllerKind, name?: string): void {
    const p = this.state.players[playerId];
    if (!p) return;
    p.controller = kind;
    if (name) p.name = name;
    if (kind === ControllerKind.Bot) {
      if (!this.ai.has(playerId)) this.ai.set(playerId, createAIController());
    } else {
      this.ai.delete(playerId);
    }
  }

  /** Drain events produced since the last call (server forwards to clients). */
  drainEvents(): SimEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
  private emit(e: SimEvent) {
    this.events.push(e);
  }

  /** Advance one fixed tick with the given human inputs (by player id). */
  tick(inputs: Map<PlayerId, PlayerInput>): void {
    const dt = TICK_DT;
    this.advancePhase(dt);

    for (const p of Object.values(this.state.players)) {
      this.stepRespawn(p, dt);
      const input = this.inputFor(p, inputs);
      this.stepMovementAndIntegrate(p, input, dt);
      this.stepKeule(p, input);
      this.stepCombat(p, input, dt);
    }

    this.integrateBalls(dt);
    this.updateHeldBalls();
    this.updateCarriedKeules();
    this.resolveThrownBalls();
    this.stepKeuleTransitions();
    if (this.state.phase === MatchPhase.ActiveMatch) {
      for (const hit of detectHits(this.state)) this.applyHit(hit.ball, hit.target, hit.by, hit.at);
    }

    this.state.tick++;
  }

  private inputFor(p: PlayerState, inputs: Map<PlayerId, PlayerInput>): PlayerInput {
    if (p.controller === ControllerKind.Human) {
      return inputs.get(p.id) ?? neutralInput();
    }
    if (p.life !== PlayerLifeState.Alive || this.state.phase !== MatchPhase.ActiveMatch) {
      return neutralInput();
    }
    const ctrl = this.ai.get(p.id);
    if (!ctrl) return neutralInput();
    const profile = DIFFICULTY_PROFILES[p.difficulty ?? this.state.config.difficulty] ?? DIFFICULTY_PROFILES.normal;
    const ctx: AIContext = {
      grid: this.navGrid,
      losBlockers: this.losers,
      cover: this.cover,
      profile,
      rng: this.rng,
    };
    return stepAI(this.state, p, ctrl, ctx, TICK_DT);
  }

  // --- integration ---

  private stepMovementAndIntegrate(p: PlayerState, input: PlayerInput, dt: number) {
    const ctrl = this.controllers.get(p.id);
    if (!ctrl) return;
    const canMove = p.life === PlayerLifeState.Alive;
    const res = stepMovement(ctrl, input, { carrying: p.carryingKeule, canMove }, dt);
    p.velocity.x = res.velocity.x;
    p.velocity.z = res.velocity.z;
    p.aim = res.facing;

    p.position.x = clamp(p.position.x + res.velocity.x * dt, PLAYABLE.xMin, PLAYABLE.xMax);
    p.position.z = clamp(p.position.z + res.velocity.z * dt, PLAYABLE.zMin, PLAYABLE.zMax);
    p.position.y = PLAYER.centerY;
    resolveCircleVsObstacles(p.position, PLAYER.radius, this.obstacles);
  }

  private integrateBalls(dt: number) {
    for (const ball of Object.values(this.state.balls)) {
      if (ball.state === BallState.Held) continue;
      const v = ball.velocity;
      v.y += PHYSICS.gravity.y * dt;
      ball.position.x += v.x * dt;
      ball.position.y += v.y * dt;
      ball.position.z += v.z * dt;

      // floor
      if (ball.position.y < BALL.radius) {
        ball.position.y = BALL.radius;
        if (Math.abs(v.y) > 1.2) this.emit({ type: 'bounce', ball: ball.id, at: { ...ball.position }, speed: len3(v), surface: 'floor' });
        v.y = -v.y * BALL.restitution;
        v.x *= 0.86;
        v.z *= 0.86;
      }
      // arena walls
      reflectWalls(ball.position, v, () =>
        this.emit({ type: 'bounce', ball: ball.id, at: { ...ball.position }, speed: len3(v), surface: 'wall' }),
      );
      // props
      if (reflectObstacles(ball.position, v, BALL.radius, this.obstacles)) {
        this.emit({ type: 'bounce', ball: ball.id, at: { ...ball.position }, speed: len3(v), surface: 'prop' });
      }

      const damp = Math.max(0, 1 - BALL.linearDamping * dt);
      v.x *= damp;
      v.z *= damp;
      ball.speed = len3(v);
    }
  }

  // --- rules glue (mirrors the client runtime, using the shared functions) ---

  private advancePhase(dt: number) {
    const s = this.state;
    if (s.phase === MatchPhase.Results) return;
    s.phaseTimer = Math.max(0, s.phaseTimer - dt);
    if (s.phase === MatchPhase.Preparation && s.phaseTimer <= 0) {
      s.phase = MatchPhase.ActiveMatch;
      s.phaseTimer = s.config.roundDurationSec;
      this.emit({ type: 'phase', phase: MatchPhase.ActiveMatch });
      this.emit({ type: 'round-start', round: s.round });
    } else if (s.phase === MatchPhase.ActiveMatch && s.phaseTimer <= 0) {
      const winner = timeExpiryWinner(s);
      endRound(s, winner, winner ? 'Most eliminations' : 'Time up — draw');
      this.emit({ type: 'round-end', winner });
      this.emit({ type: 'phase', phase: MatchPhase.RoundEnd });
    } else if (s.phase === MatchPhase.RoundEnd && s.phaseTimer <= 0) {
      const outcome = afterRoundEnd(s);
      this.emit({ type: 'phase', phase: outcome === 'results' ? MatchPhase.Results : MatchPhase.Preparation });
    }
  }

  private stepRespawn(p: PlayerState, dt: number) {
    if (p.life !== PlayerLifeState.Out) return;
    p.respawnIn = Math.max(0, p.respawnIn - dt);
    if (p.respawnIn <= 0) {
      p.life = PlayerLifeState.Alive;
      p.position = { ...p.spawn };
      p.velocity = { x: 0, y: 0, z: 0 };
      this.emit({ type: 'respawn', player: p.id });
    }
  }

  private stepCombat(p: PlayerState, input: PlayerInput, dt: number) {
    if (p.life !== PlayerLifeState.Alive) {
      p.throwCharge = 0;
      return;
    }
    if (input.throwRelease && p.heldBall) {
      this.throwBall(p, Math.max(0.12, p.throwCharge));
      p.throwCharge = 0;
    }
    if (p.heldBall && input.throwHeld) {
      p.throwCharge = Math.min(1, p.throwCharge + dt / BALL.chargeTimeSec);
    } else if (!input.throwHeld) {
      p.throwCharge = 0;
    }
    if (!p.heldBall) {
      const byE = input.interact ? nearestPickup(this.state, p) : null;
      const auto = byE ?? nearestPickup(this.state, p, 0.75);
      if (auto) this.grabBall(p, auto);
    }
  }

  private grabBall(p: PlayerState, ballId: string) {
    const ball = this.state.balls[ballId];
    if (!ball || ball.state === BallState.Held) return;
    ball.state = BallState.Held;
    ball.holder = p.id;
    ball.lastThrownBy = null;
    ball.lastThrownTeam = null;
    ball.velocity = { x: 0, y: 0, z: 0 };
    p.heldBall = ballId;
    this.emit({ type: 'pickup', player: p.id, ball: ballId });
  }

  private throwBall(p: PlayerState, charge: number) {
    const ballId = p.heldBall;
    if (!ballId) return;
    const ball = this.state.balls[ballId];
    const res = computeThrow(p, charge);
    ball.state = BallState.Thrown;
    ball.holder = null;
    ball.lastThrownBy = p.id;
    ball.lastThrownTeam = p.team;
    ball.position = { ...res.release };
    ball.velocity = { ...res.velocity };
    ball.speed = len3(res.velocity);
    p.heldBall = null;
    p.stats.throws++;
    this.emit({ type: 'throw', player: p.id, ball: ballId, power: res.power });
  }

  private updateHeldBalls() {
    for (const p of Object.values(this.state.players)) {
      if (!p.heldBall) continue;
      const ball = this.state.balls[p.heldBall];
      ball.position = heldBallPosition(p);
      ball.velocity = { x: 0, y: 0, z: 0 };
      ball.speed = 0;
    }
  }

  private resolveThrownBalls() {
    for (const ball of Object.values(this.state.balls)) {
      if (ball.state === BallState.Thrown && ball.speed < BALL.restSpeed) {
        ball.state = BallState.Idle;
        ball.lastThrownBy = null;
        ball.lastThrownTeam = null;
      }
    }
  }

  private applyHit(ballId: string, targetId: PlayerId, byId: PlayerId | null, at: { x: number; y: number; z: number }) {
    const ball = this.state.balls[ballId];
    if (ball) {
      ball.state = BallState.Idle;
      ball.lastThrownBy = null;
      ball.lastThrownTeam = null;
      ball.velocity = { x: 0, y: 0, z: 0 };
    }
    const target = this.state.players[targetId];
    if (!target || target.life !== PlayerLifeState.Alive) return;
    target.life = PlayerLifeState.Out;
    target.respawnIn = this.state.config.respawnSec;
    target.stats.deaths++;
    if (target.heldBall) {
      const held = this.state.balls[target.heldBall];
      if (held) {
        held.state = BallState.Idle;
        held.holder = null;
      }
      target.heldBall = null;
    }
    if (target.carryingKeule) this.dropKeule(target);
    const thrower = byId ? this.state.players[byId] : null;
    if (thrower && thrower.team !== target.team) {
      thrower.stats.hits++;
      this.state.roundHits[thrower.team]++;
    }
    // send OUT player to their bench
    const idx = Number(target.id.split('_')[1] ?? 0);
    const dir = target.team === Team.Blue ? -1 : 1;
    target.position = { x: dir * (2 + idx * 1.3), y: PLAYER.centerY, z: ARENA.benchZ[target.team] };
    this.emit({ type: 'hit', ball: ballId, target: targetId, by: byId, at });
    this.emit({ type: 'out', player: targetId, by: byId });
  }

  // --- Keule ---

  private carriedKeuleTeam(p: PlayerState): Team | null {
    for (const t of [Team.Blue, Team.Red] as Team[]) if (this.state.keules[t].carrier === p.id) return t;
    return null;
  }

  private stepKeule(p: PlayerState, input: PlayerInput) {
    if (p.life !== PlayerLifeState.Alive) return;
    if (p.carryingKeule) {
      if (this.state.phase === MatchPhase.Preparation && input.interact) {
        const team = this.carriedKeuleTeam(p);
        if (team) {
          const k = this.state.keules[team];
          const res = validateKeulePlacement(team, k.position, this.navGrid);
          if (res.ok) {
            k.state = KeuleState.Safe;
            k.carrier = null;
            p.carryingKeule = false;
          } else {
            this.emit({ type: 'keule-invalid', team });
          }
        }
        input.interact = false;
      }
      return;
    }
    if (input.interact) {
      const team = grabbableKeule(this.state, p);
      if (team !== null) {
        const k = this.state.keules[team];
        k.carrier = p.id;
        k.state = KeuleState.Carried;
        p.carryingKeule = true;
        p.stats.keulePickups++;
        this.emit({ type: 'keule-pickup', player: p.id, team });
        input.interact = false;
      }
    }
  }

  private dropKeule(p: PlayerState) {
    const team = this.carriedKeuleTeam(p);
    if (!team) return;
    const k = this.state.keules[team];
    k.state = KeuleState.Dropped;
    k.carrier = null;
    k.position = { x: p.position.x, y: KEULE.height / 2, z: p.position.z };
    p.carryingKeule = false;
    this.emit({ type: 'keule-drop', team, at: { ...k.position } });
  }

  private updateCarriedKeules() {
    for (const t of [Team.Blue, Team.Red] as Team[]) {
      const k = this.state.keules[t];
      if (!k.carrier) continue;
      const carrier = this.state.players[k.carrier];
      if (!carrier) continue;
      const dir = norm2(carrier.aim);
      k.position = {
        x: carrier.position.x + dir.x * 0.35,
        y: KEULE.carryHeight,
        z: carrier.position.z + dir.z * 0.35,
      };
    }
  }

  private stepKeuleTransitions() {
    for (const t of [Team.Blue, Team.Red] as Team[]) {
      const k = this.state.keules[t];
      if (!k.carrier) continue;
      const carrier = this.state.players[k.carrier];
      if (!carrier) continue;
      if (this.state.phase === MatchPhase.ActiveMatch && isCaptureCrossing(carrier, t)) {
        carrier.stats.captures++;
        k.carrier = null;
        k.state = KeuleState.Safe;
        carrier.carryingKeule = false;
        this.emit({ type: 'capture', team: carrier.team, by: carrier.id });
        endRound(this.state, carrier.team, 'Captured the enemy Keule');
        this.emit({ type: 'round-end', winner: carrier.team });
        this.emit({ type: 'phase', phase: MatchPhase.RoundEnd });
        return;
      }
      if (isReturnCrossing(carrier, t)) {
        k.state = KeuleState.Safe;
        k.carrier = null;
        k.position = { ...k.home };
        carrier.carryingKeule = false;
        carrier.stats.keuleReturns++;
        this.emit({ type: 'keule-return', team: t });
      }
    }
  }
}

// --- integration helpers ---

function resolveCircleVsObstacles(pos: { x: number; z: number }, radius: number, obstacles: AABB[]) {
  for (const o of obstacles) {
    const cx = clamp(pos.x, o.minX, o.maxX);
    const cz = clamp(pos.z, o.minZ, o.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        // centre inside box — push out on the least-penetrating axis
        const left = pos.x - o.minX;
        const right = o.maxX - pos.x;
        const up = pos.z - o.minZ;
        const down = o.maxZ - pos.z;
        const m = Math.min(left, right, up, down);
        if (m === left) pos.x = o.minX - radius;
        else if (m === right) pos.x = o.maxX + radius;
        else if (m === up) pos.z = o.minZ - radius;
        else pos.z = o.maxZ + radius;
      }
    }
  }
}

function reflectWalls(pos: { x: number; z: number }, v: { x: number; z: number }, onBounce: () => void) {
  const min = -ARENA.halfLength + ARENA.wallThickness;
  const maxX = ARENA.halfLength - ARENA.wallThickness;
  const minZ = -ARENA.halfWidth + ARENA.wallThickness;
  const maxZ = ARENA.halfWidth - ARENA.wallThickness;
  let bounced = false;
  if (pos.x < min) {
    pos.x = min;
    v.x = -v.x * BALL.restitution;
    bounced = true;
  } else if (pos.x > maxX) {
    pos.x = maxX;
    v.x = -v.x * BALL.restitution;
    bounced = true;
  }
  if (pos.z < minZ) {
    pos.z = minZ;
    v.z = -v.z * BALL.restitution;
    bounced = true;
  } else if (pos.z > maxZ) {
    pos.z = maxZ;
    v.z = -v.z * BALL.restitution;
    bounced = true;
  }
  if (bounced) onBounce();
}

function reflectObstacles(
  pos: { x: number; y: number; z: number },
  v: { x: number; z: number },
  radius: number,
  obstacles: AABB[],
): boolean {
  let bounced = false;
  for (const o of obstacles) {
    const cx = clamp(pos.x, o.minX, o.maxX);
    const cz = clamp(pos.z, o.minZ, o.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    if (dx * dx + dz * dz < radius * radius) {
      // reflect on the dominant axis of penetration
      if (Math.abs(dx) > Math.abs(dz)) {
        pos.x = cx + Math.sign(dx || 1) * radius;
        v.x = -v.x * BALL.restitution;
      } else {
        pos.z = cz + Math.sign(dz || 1) * radius;
        v.z = -v.z * BALL.restitution;
      }
      bounced = true;
    }
  }
  return bounced;
}
