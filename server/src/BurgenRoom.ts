import colyseus from 'colyseus';
import type { Client } from 'colyseus';
import {
  ControllerKind,
  DEFAULT_ROOM_SETTINGS,
  HeadlessMatch,
  MatchPhase,
  NET_MSG,
  TICK_DT,
  Team,
  makeRoomCode,
  neutralInput,
  type MatchConfig,
  type PlayerInput,
  type RoomSettings,
} from '@shared';
import { ArenaState, BallNet, KeuleNet, PlayerNet } from './schema';

const { Room } = colyseus;

/**
 * Authoritative game room. Runs the shared HeadlessMatch at a fixed 60 Hz tick;
 * clients only send input intents and never decide hits, captures, XP or Keule
 * state. Colyseus syncs deltas of ArenaState to every client.
 */
export class BurgenRoom extends Room<ArenaState> {
  private sim: HeadlessMatch | null = null;
  private settings: RoomSettings = { ...DEFAULT_ROOM_SETTINGS };
  private latestInputs = new Map<string, PlayerInput>();
  private sessionToSeat = new Map<string, string>();
  private seatToSession = new Map<string, string>();
  private acc = 0;
  private finalized = false;

  override onCreate(options: { name?: string; code?: string; settings?: Partial<RoomSettings> }) {
    this.settings = { ...DEFAULT_ROOM_SETTINGS, ...(options.settings ?? {}) };
    const state = new ArenaState();
    state.code = options.code || makeRoomCode();
    this.mirrorSettings(state);
    this.setState(state);
    this.maxClients = this.settings.teamSize * 2;

    this.onMessage(NET_MSG.input, (client, msg: PlayerInput) => {
      this.latestInputs.set(client.sessionId, coerceInput(msg));
    });
    this.onMessage(NET_MSG.ready, (client) => {
      const p = this.state.players.get(client.sessionId);
      if (p && !this.state.started) p.ready = !p.ready;
    });
    this.onMessage(NET_MSG.start, (client) => {
      if (client.sessionId === this.state.ownerSessionId && !this.state.started) this.startMatch();
    });
    this.onMessage(NET_MSG.settings, (client, msg: Partial<RoomSettings>) => {
      if (client.sessionId !== this.state.ownerSessionId || this.state.started) return;
      this.settings = { ...this.settings, ...msg };
      this.mirrorSettings(this.state);
      this.maxClients = this.settings.teamSize * 2;
    });
    this.onMessage(NET_MSG.reassign, (client, msg: { sessionId: string; team: string }) => {
      if (client.sessionId !== this.state.ownerSessionId || this.state.started) return;
      const p = this.state.players.get(msg.sessionId);
      if (p) p.team = msg.team === 'red' ? 'red' : 'blue';
    });

    this.updateMetadata();
  }

  override onJoin(client: Client, options: { name?: string }) {
    if (!this.state.ownerSessionId) this.state.ownerSessionId = client.sessionId;
    if (this.state.started) return; // spectators can't seat mid-match in the slice

    const blue = this.countTeam('blue');
    const red = this.countTeam('red');
    const p = new PlayerNet();
    p.id = client.sessionId;
    p.sessionId = client.sessionId;
    p.name = (options.name || 'Player').slice(0, 16);
    p.team = blue <= red ? 'blue' : 'red';
    p.controller = 'human';
    this.state.players.set(client.sessionId, p);
    this.updateMetadata();
  }

  override onLeave(client: Client) {
    this.latestInputs.delete(client.sessionId);
    if (!this.state.started) {
      this.state.players.delete(client.sessionId);
    } else {
      const seat = this.sessionToSeat.get(client.sessionId);
      if (seat && this.sim) {
        this.sim.assignSeat(seat, ControllerKind.Bot); // hand the seat to a bot
        const pn = this.state.players.get(seat);
        if (pn) {
          pn.sessionId = '';
          pn.controller = 'bot';
        }
      }
      this.sessionToSeat.delete(client.sessionId);
    }
    // reassign owner if they left
    if (client.sessionId === this.state.ownerSessionId) {
      const next = [...this.state.players.values()].find((p) => p.sessionId && p.sessionId !== client.sessionId);
      this.state.ownerSessionId = next?.sessionId ?? '';
    }
    this.updateMetadata();
  }

  // --- match lifecycle ---

  private startMatch() {
    const config: MatchConfig = {
      teamSize: this.settings.teamSize,
      difficulty: this.settings.botDifficulty,
      rounds: this.settings.rounds,
      roundDurationSec: this.settings.roundDurationSec,
      respawnSec: this.settings.respawnSec,
      preparationSec: this.settings.preparationSec,
      friendlyFire: this.settings.friendlyFire,
    };
    const sim = new HeadlessMatch(config, () => Math.random());
    this.sim = sim;

    // seat humans by team, in join order, then fill the rest with bots
    const counts: Record<string, number> = { blue: 0, red: 0 };
    this.seatToSession.clear();
    this.sessionToSeat.clear();
    for (const [sid, pn] of this.state.players.entries()) {
      const team = pn.team === 'red' ? 'red' : 'blue';
      const idx = counts[team];
      if (idx >= config.teamSize) continue;
      counts[team]++;
      const seat = `${team}_${idx}`;
      sim.assignSeat(seat, ControllerKind.Human, pn.name);
      this.seatToSession.set(seat, sid);
      this.sessionToSeat.set(sid, seat);
    }
    for (const pid of Object.keys(sim.state.players)) {
      if (!this.seatToSession.has(pid)) sim.assignSeat(pid, ControllerKind.Bot);
    }

    // rekey schema.players from sessionId → seat entities
    this.state.players.clear();
    for (const p of Object.values(sim.state.players)) {
      const pn = new PlayerNet();
      pn.id = p.id;
      pn.sessionId = this.seatToSession.get(p.id) ?? '';
      pn.name = p.name;
      pn.team = p.team;
      pn.controller = p.controller;
      this.state.players.set(p.id, pn);
    }
    for (const b of Object.values(sim.state.balls)) {
      const bn = new BallNet();
      bn.id = b.id;
      this.state.balls.set(b.id, bn);
    }
    for (const t of [Team.Blue, Team.Red] as Team[]) {
      const kn = new KeuleNet();
      kn.team = t;
      this.state.keules.set(t, kn);
    }

    this.state.started = true;
    this.finalized = false;
    this.updateMetadata();
    this.setSimulationInterval((dtMs) => this.step(dtMs), 1000 / 60);
  }

  private step(deltaMs: number) {
    const sim = this.sim;
    if (!sim) return;
    this.acc += deltaMs / 1000;
    let guard = 0;
    while (this.acc >= TICK_DT && guard < 5) {
      const inputs = new Map<string, PlayerInput>();
      for (const [sid, inp] of this.latestInputs) {
        const seat = this.sessionToSeat.get(sid);
        if (seat) inputs.set(seat, inp);
      }
      sim.tick(inputs);
      this.acc -= TICK_DT;
      guard++;
    }
    if (guard >= 5) this.acc = 0;

    this.syncSchema();
    const events = sim.drainEvents();
    if (events.length) this.broadcast(NET_MSG.events, events);

    if (sim.state.phase === MatchPhase.Results && !this.finalized) {
      this.finalized = true;
      this.updateMetadata();
    }
  }

  private syncSchema() {
    const sim = this.sim;
    if (!sim) return;
    const s = sim.state;
    this.state.phase = s.phase;
    this.state.round = s.round;
    this.state.phaseTimer = s.phaseTimer;
    this.state.scoreBlue = s.scores[Team.Blue];
    this.state.scoreRed = s.scores[Team.Red];
    this.state.lastRoundWinner = s.lastRoundWinner ?? '';
    this.state.lastRoundReason = s.lastRoundReason;
    this.state.matchWinner = s.matchWinner ?? '';
    this.state.mvpId = s.mvpId ?? '';
    this.state.mvpReason = s.mvpReason;

    for (const p of Object.values(s.players)) {
      const pn = this.state.players.get(p.id);
      if (!pn) continue;
      pn.life = p.life;
      pn.x = p.position.x;
      pn.y = p.position.y;
      pn.z = p.position.z;
      pn.aimX = p.aim.x;
      pn.aimZ = p.aim.z;
      pn.heldBall = p.heldBall ?? '';
      pn.carrying = p.carryingKeule;
      pn.charge = p.throwCharge;
      pn.respawnIn = p.respawnIn;
      pn.hits = p.stats.hits;
      pn.deaths = p.stats.deaths;
      pn.captures = p.stats.captures;
      pn.keuleReturns = p.stats.keuleReturns;
      pn.keulePickups = p.stats.keulePickups;
    }
    for (const b of Object.values(s.balls)) {
      const bn = this.state.balls.get(b.id);
      if (!bn) continue;
      bn.state = b.state;
      bn.x = b.position.x;
      bn.y = b.position.y;
      bn.z = b.position.z;
      bn.holder = b.holder ?? '';
    }
    for (const t of [Team.Blue, Team.Red] as Team[]) {
      const kn = this.state.keules.get(t);
      const k = s.keules[t];
      if (!kn) continue;
      kn.state = k.state;
      kn.x = k.position.x;
      kn.y = k.position.y;
      kn.z = k.position.z;
      kn.carrier = k.carrier ?? '';
    }
  }

  // --- helpers ---

  private countTeam(team: string): number {
    let n = 0;
    for (const p of this.state.players.values()) if (p.team === team) n++;
    return n;
  }

  private mirrorSettings(state: ArenaState) {
    state.teamSize = this.settings.teamSize;
    state.rounds = this.settings.rounds;
    state.roundDurationSec = this.settings.roundDurationSec;
    state.friendlyFire = this.settings.friendlyFire;
    state.botDifficulty = this.settings.botDifficulty;
  }

  private updateMetadata() {
    void this.setMetadata({
      code: this.state.code,
      started: this.state.started,
      players: this.state.players.size,
      max: this.maxClients,
      isPrivate: this.settings.isPrivate,
    });
  }
}

/** Coerce untrusted client input into a safe PlayerInput. */
function coerceInput(msg: Partial<PlayerInput> | undefined): PlayerInput {
  const base = neutralInput();
  if (!msg) return base;
  const clampC = (n: unknown) => (typeof n === 'number' && isFinite(n) ? Math.max(-1, Math.min(1, n)) : 0);
  return {
    move: { x: clampC(msg.move?.x), z: clampC(msg.move?.z) },
    aim: { x: clampC(msg.aim?.x), z: clampC(msg.aim?.z) },
    sprint: !!msg.sprint,
    dash: !!msg.dash,
    throwHeld: !!msg.throwHeld,
    throwRelease: !!msg.throwRelease,
    interact: !!msg.interact,
  };
}
