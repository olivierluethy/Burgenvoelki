import type { RapierRigidBody } from '@react-three/rapier';
import {
  ControllerKind,
  FixedClock,
  MatchPhase,
  PLAYABLE,
  PlayerLifeState,
  Team,
  createInitialGameState,
  createMovementController,
  neutralInput,
  stepMovement,
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

  setHumanAim(a: Vec2) {
    this.humanAim = a;
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

    for (const p of Object.values(this.state.players)) {
      this.stepRespawn(p, dt);
      const input = this.buildInput(p);
      this.applyMovement(p, input, dt);
    }

    this.state.tick++;
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
      this.emit({ type: 'respawn', player: p.id });
      // teleport back to a spawn-side position handled by the rig watching life.
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
