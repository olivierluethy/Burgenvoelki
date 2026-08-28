import type { RapierRigidBody } from '@react-three/rapier';
import {
  ARENA,
  BALL,
  BallState,
  ControllerKind,
  FixedClock,
  MatchPhase,
  PLAYABLE,
  PLAYER,
  PlayerLifeState,
  Team,
  computeThrow,
  createInitialGameState,
  createMovementController,
  detectHits,
  heldBallPosition,
  len3,
  nearestPickup,
  neutralInput,
  stepMovement,
  type BallId,
  type GameState,
  type MatchConfig,
  type MovementController,
  type PlayerId,
  type PlayerInput,
  type PlayerState,
  type SimEvent,
  type Vec2,
} from '@shared';
import { inputManager } from '@/game/input/inputManager';
import { useMatchStore, type HudSnapshot } from './matchStore';

/** How many fixed ticks between HUD snapshot pushes (~15 Hz at 60 Hz sim). */
const HUD_EVERY = 4;

/**
 * The match runtime. Owns the authoritative GameState and advances it on a
 * fixed timestep, bridging the shared rules to Rapier bodies. Rendering only
 * ever reads projections of this; game logic never lives in React render code.
 */
export class GameRuntime {
  state: GameState;
  readonly clock = new FixedClock();
  private bodies = new Map<PlayerId, RapierRigidBody>();
  private ballBodies = new Map<BallId, RapierRigidBody>();
  private controllers = new Map<PlayerId, MovementController>();
  private listeners = new Set<(e: SimEvent) => void>();
  private hudTick = 0;
  /** Human aim direction on the floor plane, set each render frame. */
  humanAim: Vec2 = { x: 1, z: 0 };
  paused = false;
  private pendingShake = 0;

  constructor(config: MatchConfig) {
    this.state = createInitialGameState(config);
    for (const p of Object.values(this.state.players)) {
      this.controllers.set(p.id, createMovementController({ ...p.aim }));
    }
  }

  // --- events (FX / audio subscribe directly, off the React render path) ---
  onEvent(cb: (e: SimEvent) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  protected emit(e: SimEvent) {
    for (const l of this.listeners) l(e);
  }

  // --- body registry ---
  registerBody(id: PlayerId, body: RapierRigidBody) {
    this.bodies.set(id, body);
  }
  unregisterBody(id: PlayerId) {
    this.bodies.delete(id);
  }
  getBody(id: PlayerId): RapierRigidBody | undefined {
    return this.bodies.get(id);
  }
  registerBallBody(id: BallId, body: RapierRigidBody) {
    this.ballBodies.set(id, body);
  }
  unregisterBallBody(id: BallId) {
    this.ballBodies.delete(id);
  }
  getBallBody(id: BallId): RapierRigidBody | undefined {
    return this.ballBodies.get(id);
  }

  setHumanAim(a: Vec2) {
    this.humanAim = a;
  }

  /** Physics bridge: a ball collided with a surface — surfaced for bounce SFX/FX. */
  reportBounce(ballId: BallId, at: { x: number; y: number; z: number }, speed: number, surface: 'floor' | 'wall' | 'prop') {
    this.emit({ type: 'bounce', ball: ballId, at, speed, surface });
  }

  /** FX hook: request a camera shake pulse (0..~1.5), consumed by FollowCamera. */
  requestCameraShake(amount: number) {
    this.pendingShake = Math.min(2, this.pendingShake + amount);
  }
  consumeCameraShake(): number {
    const v = this.pendingShake;
    this.pendingShake = 0;
    return v;
  }

  /** Called once per render frame with elapsed seconds. */
  frame(delta: number) {
    if (this.paused) return;
    const ticks = this.clock.advance(delta);
    for (let i = 0; i < ticks; i++) this.tick();
    if (ticks > 0) {
      this.hudTick += ticks;
      if (this.hudTick >= HUD_EVERY) {
        this.hudTick = 0;
        this.pushHud();
      }
    }
  }

  private tick() {
    const dt = this.clock.dt;
    this.advancePhase(dt);
    this.syncBalls();

    for (const p of Object.values(this.state.players)) {
      this.stepRespawn(p, dt);
      const input = this.buildInput(p);
      this.applyMovement(p, input, dt);
      this.stepCombat(p, input, dt);
    }

    this.updateHeldBalls();
    this.resolveThrownBalls();
    if (this.state.phase === MatchPhase.ActiveMatch) this.resolveHits();

    this.state.tick++;
  }

  /** Pull ball transforms from physics into the authoritative snapshots. */
  private syncBalls() {
    for (const ball of Object.values(this.state.balls)) {
      if (ball.state === BallState.Held) continue; // driven by updateHeldBalls
      const body = this.ballBodies.get(ball.id);
      if (!body) continue;
      const t = body.translation();
      const v = body.linvel();
      ball.position.x = t.x;
      ball.position.y = t.y;
      ball.position.z = t.z;
      ball.velocity.x = v.x;
      ball.velocity.y = v.y;
      ball.velocity.z = v.z;
      ball.speed = len3(v);
    }
  }

  private stepCombat(p: PlayerState, input: PlayerInput, dt: number) {
    if (p.life !== PlayerLifeState.Alive) {
      p.throwCharge = 0;
      return;
    }

    // release an in-hand ball
    if (input.throwRelease && p.heldBall) {
      this.throwBall(p, Math.max(0.12, p.throwCharge));
      p.throwCharge = 0;
    }

    // charge while holding the throw button with a ball in hand
    if (p.heldBall && input.throwHeld) {
      p.throwCharge = Math.min(1, p.throwCharge + dt / BALL.chargeTimeSec);
    } else if (!input.throwHeld) {
      p.throwCharge = 0;
    }

    // pickup: E within reach, or automatic when almost on top of a ball
    if (!p.heldBall) {
      const byE = input.interact ? nearestPickup(this.state, p) : null;
      const auto = byE ?? nearestPickup(this.state, p, 0.75);
      if (auto) this.grabBall(p, auto);
    }
  }

  private grabBall(p: PlayerState, ballId: BallId) {
    const ball = this.state.balls[ballId];
    const body = this.ballBodies.get(ballId);
    if (!ball || ball.state === BallState.Held) return;
    ball.state = BallState.Held;
    ball.holder = p.id;
    ball.lastThrownBy = null;
    ball.lastThrownTeam = null;
    p.heldBall = ballId;
    if (body) {
      body.setBodyType(2 /* KinematicPositionBased */, true);
      body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }
    this.emit({ type: 'pickup', player: p.id, ball: ballId });
  }

  private throwBall(p: PlayerState, charge: number) {
    const ballId = p.heldBall;
    if (!ballId) return;
    const ball = this.state.balls[ballId];
    const body = this.ballBodies.get(ballId);
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
    if (body) {
      body.setBodyType(0 /* Dynamic */, true);
      body.setTranslation(res.release, true);
      body.setLinvel(res.velocity, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
    this.emit({ type: 'throw', player: p.id, ball: ballId, power: res.power });
  }

  private updateHeldBalls() {
    for (const p of Object.values(this.state.players)) {
      if (!p.heldBall) continue;
      const ball = this.state.balls[p.heldBall];
      const body = this.ballBodies.get(p.heldBall);
      const pos = heldBallPosition(p);
      ball.position = { ...pos };
      ball.velocity = { x: 0, y: 0, z: 0 };
      ball.speed = 0;
      if (body) body.setNextKinematicTranslation(pos);
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

  private resolveHits() {
    for (const hit of detectHits(this.state)) {
      this.applyHit(hit.ball, hit.target, hit.by, hit.at);
    }
  }

  private applyHit(ballId: BallId, targetId: PlayerId, byId: PlayerId | null, at: { x: number; y: number; z: number }) {
    const ball = this.state.balls[ballId];
    // neutralise the ball wherever it struck
    if (ball) {
      ball.state = BallState.Idle;
      ball.lastThrownBy = null;
      ball.lastThrownTeam = null;
      const body = this.ballBodies.get(ballId);
      if (body) body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    const target = this.state.players[targetId];
    if (!target || target.life !== PlayerLifeState.Alive) return;

    target.life = PlayerLifeState.Out;
    target.respawnIn = this.state.config.respawnSec;
    target.stats.deaths++;

    // drop anything the target was holding
    if (target.heldBall) {
      const held = this.state.balls[target.heldBall];
      if (held) {
        held.state = BallState.Idle;
        held.holder = null;
        const hb = this.ballBodies.get(target.heldBall);
        if (hb) {
          hb.setBodyType(0, true);
          hb.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      }
      target.heldBall = null;
    }
    if (target.carryingKeule) this.dropKeule(target);

    const thrower = byId ? this.state.players[byId] : null;
    if (thrower && thrower.team !== target.team) thrower.stats.hits++;

    this.moveToBench(target);
    this.emit({ type: 'hit', ball: ballId, target: targetId, by: byId, at });
    this.emit({ type: 'out', player: targetId, by: byId });
    if (target.id === this.state.humanId) this.requestCameraShake(1.0);
  }

  /** Placeholder until M3 wires the Keule; kept so applyHit stays stable. */
  protected dropKeule(_p: PlayerState) {
    // implemented in the Keule milestone
  }

  private moveToBench(p: PlayerState) {
    const body = this.bodies.get(p.id);
    if (!body) return;
    const idx = Number(p.id.split('_')[1] ?? 0);
    const dir = p.team === Team.Blue ? -1 : 1;
    const x = dir * (2 + idx * 1.3);
    body.setTranslation({ x, y: PLAYER.centerY, z: ARENA.benchZ[p.team] }, true);
    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  private advancePhase(dt: number) {
    const s = this.state;
    if (s.phase === MatchPhase.Preparation || s.phase === MatchPhase.ActiveMatch) {
      s.phaseTimer = Math.max(0, s.phaseTimer - dt);
      if (s.phase === MatchPhase.Preparation && s.phaseTimer <= 0) {
        s.phase = MatchPhase.ActiveMatch;
        s.phaseTimer = s.config.roundDurationSec;
        this.emit({ type: 'phase', phase: MatchPhase.ActiveMatch });
        this.emit({ type: 'round-start', round: s.round });
      }
    }
  }

  private stepRespawn(p: PlayerState, dt: number) {
    if (p.life !== PlayerLifeState.Out) return;
    p.respawnIn = Math.max(0, p.respawnIn - dt);
    if (p.respawnIn <= 0) {
      p.life = PlayerLifeState.Alive;
      const body = this.bodies.get(p.id);
      if (body) {
        body.setTranslation({ ...p.spawn }, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
      this.emit({ type: 'respawn', player: p.id });
    }
  }

  private buildInput(p: PlayerState): PlayerInput {
    if (p.controller === ControllerKind.Human) {
      return {
        move: inputManager.moveVector(),
        aim: this.humanAim,
        sprint: inputManager.sprint(),
        dash: inputManager.consumeDash(),
        throwHeld: inputManager.throwHeld(),
        throwRelease: inputManager.consumeThrowRelease(),
        interact: inputManager.consumeInteract(),
      };
    }
    // Bots idle until the AI milestone (M5) drives them.
    return neutralInput();
  }

  private applyMovement(p: PlayerState, input: PlayerInput, dt: number) {
    const body = this.bodies.get(p.id);
    const ctrl = this.controllers.get(p.id);
    if (!body || !ctrl) return;

    const canMove = p.life === PlayerLifeState.Alive;
    const res = stepMovement(ctrl, input, { carrying: p.carryingKeule, canMove }, dt);

    // apply planar velocity, preserve vertical (gravity) component
    const cur = body.linvel();
    body.setLinvel({ x: res.velocity.x, y: cur.y, z: res.velocity.z }, true);

    // read authoritative transform back into game state
    const t = body.translation();
    p.position.x = t.x;
    p.position.y = t.y;
    p.position.z = t.z;
    p.velocity.x = res.velocity.x;
    p.velocity.z = res.velocity.z;
    p.aim = res.facing;

    // hard safety clamp if a body escapes the walls
    if (
      t.x < PLAYABLE.xMin - 2 ||
      t.x > PLAYABLE.xMax + 2 ||
      t.z < PLAYABLE.zMin - 2 ||
      t.z > PLAYABLE.zMax + 2
    ) {
      body.setTranslation({ x: 0, y: t.y, z: 0 }, true);
    }
  }

  private pushHud() {
    const s = this.state;
    const hud: HudSnapshot = {
      active: true,
      tick: s.tick,
      phase: s.phase,
      round: s.round,
      phaseTimer: s.phaseTimer,
      scores: { ...s.scores },
      humanId: s.humanId,
      players: Object.values(s.players).map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        life: p.life,
        respawnIn: p.respawnIn,
        carryingKeule: p.carryingKeule,
        heldBall: p.heldBall,
        throwCharge: p.throwCharge,
        level: p.level,
        stats: { ...p.stats },
        isHuman: p.controller === ControllerKind.Human,
      })),
      keules: [Team.Blue, Team.Red].map((t) => ({
        team: t,
        state: s.keules[t].state,
      })),
    };
    useMatchStore.getState().setHud(hud);
  }

  dispose() {
    this.listeners.clear();
    this.bodies.clear();
    useMatchStore.getState().reset();
  }
}
