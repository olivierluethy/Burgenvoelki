import { TICK_DT, Team, awardMatch, type AwardSummary, type MatchResult } from '@shared';
import type { GameRuntime } from '@/game/runtime/GameRuntime';
import { useProfileStore } from '@/state/profileStore';

/**
 * At match end, translate the human's authoritative match stats into a
 * MatchResult and run the shared progression service (XP, challenges, badges,
 * chests, battle pass), persisting the updated profile. Returns the reward
 * summary for the results screen.
 */
export function grantMatchRewards(runtime: GameRuntime): AwardSummary {
  const s = runtime.state;
  const human = s.players[s.humanId];
  const humanTeam = human?.team ?? Team.Blue;

  const result: MatchResult = {
    won: s.matchWinner === humanTeam,
    isMvp: s.mvpId === s.humanId,
    hits: human?.stats.hits ?? 0,
    captures: human?.stats.captures ?? 0,
    keuleReturns: human?.stats.keuleReturns ?? 0,
    keulePickups: human?.stats.keulePickups ?? 0,
    deaths: human?.stats.deaths ?? 0,
    durationSec: s.tick * TICK_DT,
    difficulty: s.config.difficulty,
  };

  const profile = structuredClone(useProfileStore.getState().profile);
  const summary = awardMatch(profile, result, Date.now());
  useProfileStore.getState().setProfile(profile);
  return summary;
}
