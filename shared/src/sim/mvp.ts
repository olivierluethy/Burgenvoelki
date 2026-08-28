import { MVP_WEIGHTS } from '../config';
import type { PlayerId } from '../types';
import type { GameState } from './state';

export interface MvpResult {
  playerId: PlayerId;
  score: number;
  reason: string;
}

/** Weighted MVP score for one player's match stats (objectives ≫ raw hits). */
export function mvpScore(stats: {
  captures: number;
  keuleReturns: number;
  keulePickups: number;
  hits: number;
  deaths: number;
  throws: number;
}): number {
  return (
    stats.captures * MVP_WEIGHTS.capture +
    stats.keuleReturns * MVP_WEIGHTS.keuleReturn +
    stats.keulePickups * MVP_WEIGHTS.keulePickup +
    stats.hits * MVP_WEIGHTS.hit +
    stats.deaths * MVP_WEIGHTS.death +
    stats.throws * MVP_WEIGHTS.throw
  );
}

/** Pick the MVP and build a short reason line from their dominant actions. */
export function computeMvp(state: GameState): MvpResult | null {
  const players = Object.values(state.players);
  if (players.length === 0) return null;

  let best = players[0];
  let bestScore = -Infinity;
  for (const p of players) {
    const s = mvpScore(p.stats);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }

  const parts: string[] = [];
  const st = best.stats;
  if (st.captures) parts.push(`${st.captures} capture${st.captures > 1 ? 's' : ''}`);
  if (st.keuleReturns) parts.push(`${st.keuleReturns} return${st.keuleReturns > 1 ? 's' : ''}`);
  if (st.hits) parts.push(`${st.hits} hit${st.hits > 1 ? 's' : ''}`);
  if (parts.length === 0) parts.push('steady all-round play');

  return { playerId: best.id, score: bestScore, reason: parts.join(' · ') };
}
