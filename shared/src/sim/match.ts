import { MATCH } from '../config';
import { MatchPhase, PlayerLifeState, Team, KeuleState, type PlayerState } from '../types';
import { spawnInitialBalls } from './ball';
import { computeMvp } from './mvp';
import type { GameState } from './state';

/** Round wins required to take the match (majority of configured rounds). */
export function roundWinsNeeded(state: GameState): number {
  return Math.floor(state.config.rounds / 2) + 1;
}

export function isMatchOver(state: GameState): boolean {
  const need = roundWinsNeeded(state);
  if (state.scores[Team.Blue] >= need || state.scores[Team.Red] >= need) return true;
  // hard cap so a match can't run forever on repeated draws
  const played = state.round;
  return played >= state.config.rounds && state.scores[Team.Blue] !== state.scores[Team.Red];
}

/** Record a round win and move to the ROUND_END banner. */
export function endRound(state: GameState, winner: Team | null, reason: string): void {
  if (winner) state.scores[winner] += 1;
  state.lastRoundWinner = winner;
  state.lastRoundReason = reason;
  state.phase = MatchPhase.RoundEnd;
  state.phaseTimer = MATCH.roundEndSec;
}

/** Decide the winner when the round timer expires: more eliminations wins. */
export function timeExpiryWinner(state: GameState): Team | null {
  const b = state.roundHits[Team.Blue];
  const r = state.roundHits[Team.Red];
  if (b === r) return null;
  return b > r ? Team.Blue : Team.Red;
}

/** After the ROUND_END banner: either finish the match or set up the next round. */
export function afterRoundEnd(state: GameState): 'results' | 'next' {
  if (isMatchOver(state)) {
    finalizeMatch(state);
    return 'results';
  }
  resetForNextRound(state);
  return 'next';
}

export function finalizeMatch(state: GameState): void {
  const need = roundWinsNeeded(state);
  state.matchWinner =
    state.scores[Team.Blue] >= need
      ? Team.Blue
      : state.scores[Team.Red] >= need
        ? Team.Red
        : state.scores[Team.Blue] > state.scores[Team.Red]
          ? Team.Blue
          : state.scores[Team.Red] > state.scores[Team.Blue]
            ? Team.Red
            : null;
  const mvp = computeMvp(state);
  state.mvpId = mvp?.playerId ?? null;
  state.mvpReason = mvp?.reason ?? '';
  state.phase = MatchPhase.Results;
  state.phaseTimer = 0;
}

/** Reset the world for a fresh round (keeps cumulative match stats). */
export function resetForNextRound(state: GameState): void {
  state.round += 1;
  state.roundHits = { [Team.Blue]: 0, [Team.Red]: 0 };
  state.phase = MatchPhase.Preparation;
  state.phaseTimer = state.config.preparationSec;

  for (const p of Object.values(state.players)) {
    resetPlayerForRound(p);
  }

  for (const team of [Team.Blue, Team.Red] as Team[]) {
    const k = state.keules[team];
    k.state = KeuleState.Safe;
    k.carrier = null;
    k.position = { ...k.home };
  }

  spawnInitialBalls(state);
}

function resetPlayerForRound(p: PlayerState): void {
  p.life = PlayerLifeState.Alive;
  p.respawnIn = 0;
  p.position = { ...p.spawn };
  p.velocity = { x: 0, y: 0, z: 0 };
  p.heldBall = null;
  p.throwCharge = 0;
  p.carryingKeule = false;
}
