/**
 * Persistence schema + adapter interface. For the slice this is backed by
 * localStorage in the client; the multiplayer milestone swaps the adapter for
 * the server without touching callers. Design the *types* here so a real DB can
 * back the identical models later.
 */

export interface PlayerProfile {
  id: string;
  username: string;
  createdAt: number;
  level: number;
  xp: number; // xp within the current level
  totalXp: number;
  wins: number;
  losses: number;
  hits: number;
  mvps: number;
  captures: number;
  matchesPlayed: number;
  /** Unlocked cosmetic item ids. */
  unlocked: string[];
  /** Currently equipped cosmetics by slot. */
  equipped: Record<string, string>;
  /** Earned badge ids. */
  badges: string[];
  battlePass: BattlePassProgress;
  challenges: ChallengeProgress[];
  /** Unopened chests owned. */
  chests: string[];
  currency: number; // soft currency for future use
}

export interface BattlePassProgress {
  seasonId: string;
  level: number;
  xp: number;
  claimed: number[]; // claimed reward levels
}

export interface ChallengeProgress {
  id: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
  /** ISO date bucket this challenge belongs to (for daily/weekly rotation). */
  period: string;
}

export const PROFILE_SCHEMA_VERSION = 1;

export interface PersistedRoot {
  version: number;
  profile: PlayerProfile;
}

/** Storage boundary — the only thing that changes between local and server. */
export interface PersistenceAdapter {
  load(): PersistedRoot | null;
  save(root: PersistedRoot): void;
  clear(): void;
}

export function defaultProfile(username = 'Player'): PlayerProfile {
  return {
    id: cryptoId(),
    username,
    createdAt: Date.now(),
    level: 1,
    xp: 0,
    totalXp: 0,
    wins: 0,
    losses: 0,
    hits: 0,
    mvps: 0,
    captures: 0,
    matchesPlayed: 0,
    unlocked: ['outfit_default', 'trail_none'],
    equipped: { outfit: 'outfit_default', trail: 'trail_none' },
    badges: [],
    battlePass: { seasonId: 'season_1', level: 1, xp: 0, claimed: [] },
    challenges: [],
    chests: [],
    currency: 0,
  };
}

function cryptoId(): string {
  // Works in browser and Node ≥ 19.
  try {
    return (globalThis.crypto as Crypto).randomUUID();
  } catch {
    return 'id_' + Math.random().toString(36).slice(2, 10);
  }
}
