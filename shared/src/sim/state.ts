import { ARENA, PLAYER } from '../config';
import {
  ControllerKind,
  MatchPhase,
  PlayerLifeState,
  Team,
  emptyMatchStats,
  type BallSnapshot,
  type KeuleEntity,
  type MatchConfig,
  type PlayerId,
  type PlayerState,
  type Vec2,
} from '../types';
import { KeuleState } from '../types';
import { spawnInitialBalls } from './ball';

/**
 * Authoritative game state — the single mutable world the simulation advances
 * each tick. Rendering reads a projection of this; it never lives in React.
 */
export interface GameState {
  tick: number;
  phase: MatchPhase;
  round: number;
  /** Seconds remaining in the current phase (preparation / active round). */
  phaseTimer: number;
  players: Record<PlayerId, PlayerState>;
  balls: Record<string, BallSnapshot>;
  keules: Record<Team, KeuleEntity>;
  scores: Record<Team, number>;
  config: MatchConfig;
  humanId: PlayerId;
}

const BOT_NAMES = [
  'Reto', 'Anouk', 'Silvan', 'Livia', 'Marco', 'Nadia', 'Beat', 'Chiara',
  'Urs', 'Fabienne', 'Dario', 'Selina', 'Kilian', 'Mira', 'Noah', 'Yara',
];

/** Fan players out along z on their own half, staggered in x. */
function spawnFor(team: Team, index: number, teamSize: number): Vec2 {
  const dir = team === Team.Blue ? -1 : 1;
  const spreadZ = ARENA.halfWidth - 2.5;
  const z = teamSize === 1 ? 0 : -spreadZ + (index / (teamSize - 1)) * (2 * spreadZ);
  const x = dir * (4 + (index % 2) * 2.5);
  return { x, z };
}

export function createInitialGameState(config: MatchConfig): GameState {
  const players: Record<PlayerId, PlayerState> = {};
  let botName = 0;

  const addPlayer = (
    team: Team,
    index: number,
    controller: ControllerKind,
  ): PlayerState => {
    const isHuman = controller === ControllerKind.Human;
    const id = `${team}_${index}`;
    const spawn = spawnFor(team, index, config.teamSize);
    const aimDir: Vec2 = team === Team.Blue ? { x: 1, z: 0 } : { x: -1, z: 0 };
    const p: PlayerState = {
      id,
      name: isHuman ? 'You' : BOT_NAMES[botName++ % BOT_NAMES.length],
      team,
      controller,
      difficulty: isHuman ? undefined : config.difficulty,
      life: PlayerLifeState.Alive,
      position: { x: spawn.x, y: PLAYER.centerY, z: spawn.z },
      aim: aimDir,
      velocity: { x: 0, y: 0, z: 0 },
      heldBall: null,
      throwCharge: 0,
      carryingKeule: false,
      respawnIn: 0,
      spawn: { x: spawn.x, y: PLAYER.centerY, z: spawn.z },
      stats: emptyMatchStats(),
      level: 1,
    };
    players[id] = p;
    return p;
  };

  // Blue index 0 is the human; everyone else is a bot.
  for (let i = 0; i < config.teamSize; i++) {
    addPlayer(Team.Blue, i, i === 0 ? ControllerKind.Human : ControllerKind.Bot);
  }
  for (let i = 0; i < config.teamSize; i++) {
    addPlayer(Team.Red, i, ControllerKind.Bot);
  }

  const keules: Record<Team, KeuleEntity> = {
    [Team.Blue]: {
      team: Team.Blue,
      state: KeuleState.Safe,
      position: { ...ARENA.keuleHome[Team.Blue] },
      carrier: null,
      home: { ...ARENA.keuleHome[Team.Blue] },
    },
    [Team.Red]: {
      team: Team.Red,
      state: KeuleState.Safe,
      position: { ...ARENA.keuleHome[Team.Red] },
      carrier: null,
      home: { ...ARENA.keuleHome[Team.Red] },
    },
  };

  const state: GameState = {
    tick: 0,
    phase: MatchPhase.Preparation,
    round: 1,
    phaseTimer: config.preparationSec,
    players,
    balls: {},
    keules,
    scores: { [Team.Blue]: 0, [Team.Red]: 0 },
    config,
    humanId: 'blue_0',
  };
  spawnInitialBalls(state);
  return state;
}

export function alivePlayers(state: GameState): PlayerState[] {
  return Object.values(state.players).filter((p) => p.life === PlayerLifeState.Alive);
}

export function teammates(state: GameState, of: PlayerState): PlayerState[] {
  return Object.values(state.players).filter((p) => p.team === of.team && p.id !== of.id);
}

export function enemiesOf(state: GameState, of: PlayerState): PlayerState[] {
  return Object.values(state.players).filter((p) => p.team !== of.team);
}
