import { create } from 'zustand';
import {
  MatchPhase,
  Team,
  type BallId,
  type KeuleState,
  type PlayerId,
  type PlayerLifeState,
  type PlayerMatchStats,
} from '@shared';

/** Lightweight per-player view for the HUD (updated ~15 Hz, not every tick). */
export interface HudPlayer {
  id: PlayerId;
  name: string;
  team: Team;
  life: PlayerLifeState;
  respawnIn: number;
  carryingKeule: boolean;
  heldBall: BallId | null;
  throwCharge: number;
  level: number;
  stats: PlayerMatchStats;
  isHuman: boolean;
}

export interface HudKeule {
  team: Team;
  state: KeuleState;
}

export interface HudSnapshot {
  active: boolean;
  tick: number;
  phase: MatchPhase;
  round: number;
  phaseTimer: number;
  scores: Record<Team, number>;
  humanId: PlayerId;
  players: HudPlayer[];
  keules: HudKeule[];
  lastRoundWinner: Team | null;
  lastRoundReason: string;
  matchWinner: Team | null;
  mvpId: PlayerId | null;
  mvpReason: string;
}

const EMPTY: HudSnapshot = {
  active: false,
  tick: 0,
  phase: MatchPhase.Lobby,
  round: 1,
  phaseTimer: 0,
  scores: { [Team.Blue]: 0, [Team.Red]: 0 },
  humanId: 'blue_0',
  players: [],
  keules: [],
  lastRoundWinner: null,
  lastRoundReason: '',
  matchWinner: null,
  mvpId: null,
  mvpReason: '',
};

interface MatchStore {
  hud: HudSnapshot;
  setHud: (hud: HudSnapshot) => void;
  reset: () => void;
}

export const useMatchStore = create<MatchStore>((set) => ({
  hud: EMPTY,
  setHud: (hud) => set({ hud }),
  reset: () => set({ hud: EMPTY }),
}));
