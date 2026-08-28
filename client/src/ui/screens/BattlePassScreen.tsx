import {
  BATTLE_PASS,
  claimBattlePassReward,
  getActiveChallenges,
  getChest,
  getCosmetic,
  type BattlePassReward,
} from '@shared';
import { useUIStore } from '@/state/uiStore';
import { useProfileStore } from '@/state/profileStore';
import { Button, Eyebrow, CourtRule, Panel } from '@/ui/primitives';
import { audio } from '@/audio/AudioService';

function rewardLabel(r: BattlePassReward): string {
  switch (r.type) {
    case 'cosmetic':
      return getCosmetic(String(r.value))?.name ?? 'Cosmetic';
    case 'chest':
      return getChest(String(r.value))?.name ?? 'Chest';
    case 'xp':
      return `${r.value} XP`;
    case 'currency':
      return `${r.value} coins`;
  }
}

function rewardColor(r: BattlePassReward): string {
  const c = r.type === 'cosmetic' ? getCosmetic(String(r.value)) : null;
  if (c) {
    return { common: 'var(--rarity-common)', rare: 'var(--rarity-rare)', epic: 'var(--rarity-epic)', legendary: 'var(--rarity-legendary)' }[c.rarity];
  }
  return r.type === 'chest' ? 'var(--ball-pink)' : r.type === 'xp' ? 'var(--court-yellow)' : 'var(--court-green)';
}

/** Battle pass: reward track with claims, plus rotating challenges. */
export function BattlePassScreen() {
  const go = useUIStore((s) => s.go);
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const bp = profile.battlePass;

  const nextReward = BATTLE_PASS.rewards.find((r) => r.level === bp.level + 1);
  const pct = nextReward ? Math.min(100, Math.round((bp.xp / nextReward.xpNeeded) * 100)) : 100;

  const claim = (level: number) => {
    const next = structuredClone(profile);
    const note = claimBattlePassReward(next, level);
    if (note) {
      setProfile(next);
      audio.unlock();
      audio.play('capture');
    }
  };

  const active = getActiveChallenges(Date.now());

  return (
    <div className="arena-backdrop h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[1120px] px-6 py-8 md:px-8">
        <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={() => go('menu')}>
          ← Back to menu
        </button>
        <Eyebrow className="mt-6">{BATTLE_PASS.name}</Eyebrow>
        <h1 className="mt-2 font-display text-5xl font-extrabold">Battle Pass</h1>
        <CourtRule segmented className="mt-4 max-w-[360px]" />

        {/* Progress header */}
        <Panel court className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="eyebrow text-text-mid">Tier</div>
              <div className="num text-3xl font-bold text-court-yellow">{bp.level}</div>
            </div>
            <div className="flex-1 px-6">
              <div className="h-3 w-full overflow-hidden rounded-pill bg-bg-700">
                <div className="h-full rounded-pill bg-team-blue" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 text-right text-xs text-text-lo">
                {nextReward ? (
                  <>
                    <span className="num">{bp.xp}</span> / <span className="num">{nextReward.xpNeeded}</span> to tier{' '}
                    {bp.level + 1}
                  </>
                ) : (
                  'Max tier reached'
                )}
              </div>
            </div>
          </div>
        </Panel>

        {/* Reward track */}
        <Eyebrow className="mt-8">Rewards</Eyebrow>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {BATTLE_PASS.rewards.map((r) => {
            const reached = bp.level >= r.level;
            const claimed = bp.claimed.includes(r.level);
            const color = rewardColor(r);
            return (
              <div
                key={r.level}
                className={`w-40 shrink-0 rounded-md border p-3 ${reached ? 'border-bg-500 bg-bg-800' : 'border-bg-700 bg-bg-800/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-text-lo">Tier {r.level}</span>
                  {claimed && <span className="eyebrow text-success">✓</span>}
                </div>
                <div className="my-3 h-16 w-full rounded-sm" style={{ background: reached ? color : 'var(--bg-700)', opacity: reached ? 1 : 0.4 }} />
                <div className="text-sm font-semibold text-text-hi">{rewardLabel(r)}</div>
                <div className="mt-2">
                  {claimed ? (
                    <span className="eyebrow text-text-lo">Claimed</span>
                  ) : reached ? (
                    <Button size="md" block onClick={() => claim(r.level)}>
                      Claim
                    </Button>
                  ) : (
                    <span className="eyebrow text-text-lo">🔒 Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Challenges */}
        <Eyebrow className="mt-10">Challenges</Eyebrow>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {active.map(({ challenge, period }) => {
            const cp = profile.challenges.find((c) => c.id === challenge.id && c.period === period);
            const progress = cp?.progress ?? 0;
            const pctc = Math.min(100, Math.round((progress / challenge.target) * 100));
            const done = cp?.completed ?? false;
            return (
              <div key={challenge.id} className="rounded-md bg-bg-800 p-4" style={{ borderTop: `3px solid ${challenge.period === 'daily' ? 'var(--court-cyan)' : 'var(--court-magenta)'}` }}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-hi">{challenge.name}</span>
                  <span className="eyebrow text-court-yellow">+{challenge.xp} XP</span>
                </div>
                <p className="mt-1 text-xs text-text-mid">{challenge.description}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-bg-700">
                  <div
                    className="h-full rounded-pill"
                    style={{ width: `${pctc}%`, background: done ? 'var(--success)' : 'var(--team-blue)' }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-text-lo">
                  <span className="uppercase tracking-wide">{challenge.period}</span>
                  <span className="num">
                    {progress} / {challenge.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
