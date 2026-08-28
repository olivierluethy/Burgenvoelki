import { create } from 'zustand';
import { Team, type MatchPhase, type RoomSettings } from '@shared';

export type NetStatus = 'idle' | 'connecting' | 'lobby' | 'ingame' | 'error';

export interface LobbyPlayer {
  sessionId: string;
  name: string;
  team: Team;
  ready: boolean;
  isOwner: boolean;
}

export interface LobbySnapshot {
  code: string;
  ownerSessionId: string;
  started: boolean;
  players: LobbyPlayer[];
  settings: Pick<RoomSettings, 'teamSize' | 'rounds' | 'roundDurationSec' | 'friendlyFire' | 'botDifficulty'>;
}

export interface NetHudPlayer {
  id: string;
  sessionId: string;
  name: string;
  team: Team;
  life: string;
  respawnIn: number;
  carrying: boolean;
  heldBall: string;
  charge: number;
  hits: number;
  deaths: number;
  captures: number;
  keuleReturns: number;
}

export interface NetHud {
  phase: MatchPhase | string;
  round: number;
  phaseTimer: number;
  scoreBlue: number;
  scoreRed: number;
  lastRoundWinner: string;
  lastRoundReason: string;
  matchWinner: string;
  mvpId: string;
  mvpReason: string;
  keules: { team: Team; state: string }[];
  players: NetHudPlayer[];
}

interface NetState {
  status: NetStatus;
  error: string | null;
  sessionId: string;
  lobby: LobbySnapshot | null;
  hud: NetHud | null;
  set: (patch: Partial<NetState>) => void;
  reset: () => void;
}

export const useNetStore = create<NetState>((set) => ({
  status: 'idle',
  error: null,
  sessionId: '',
  lobby: null,
  hud: null,
  set: (patch) => set(patch),
  reset: () => set({ status: 'idle', error: null, sessionId: '', lobby: null, hud: null }),
}));
