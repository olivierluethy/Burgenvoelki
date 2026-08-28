import { useMemo, useState } from 'react';
import { BADGES, getBadge, getChest, xpToNext } from '@shared';
import { useUIStore } from '@/state/uiStore';
import { useProfileStore } from '@/state/profileStore';
import { Button, Eyebrow, Panel } from '@/ui/primitives';
import { CharacterPreview } from '@/ui/components/CharacterPreview';
import { ChestOpenModal } from '@/ui/components/ChestOpenModal';
import { KeuleIcon } from '@/ui/icons';

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md bg-bg-700 p-3 text-center">
      <div className="num text-2xl font-bold text-text-hi">{value}</div>
      <div className="eyebrow mt-1 text-text-lo">{label}</div>
    </div>
  );
}

/** Player profile: identity, level, stats, badges, cosmetics and chest vault. */
export function ProfileScreen() {
  const go = useUIStore((s) => s.go);
  const profile = useProfileStore((s) => s.profile);
  const [openingChest, setOpeningChest] = useState<string | null>(null);

  const nextXp = xpToNext(profile.level);
  const xpPct = Math.min(100, Math.round((profile.xp / nextXp) * 100));
  const winRate =
    profile.matchesPlayed > 0 ? Math.round((profile.wins / profile.matchesPlayed) * 100) : 0;

  const chestCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const id of profile.chests) m.set(id, (m.get(id) ?? 0) + 1);
    return [...m.entries()];
  }, [profile.chests]);

  return (
    <div className="arena-backdrop h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[1120px] px-6 py-8 md:px-8">
        <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={() => go('menu')}>
          ← Back to menu
        </button>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
          {/* Identity card */}
          <Panel court className="flex flex-col">
            <CharacterPreview
              outfit={profile.equipped.outfit}
              hat={profile.equipped.hat}
              className="aspect-[4/5] w-full"
            />
            <h1 className="mt-4 font-display text-3xl font-extrabold">{profile.username}</h1>
            <div className="mt-3 flex items-center justify-between">
              <span className="eyebrow text-text-mid">Level</span>
              <span className="num text-xl font-bold text-court-yellow">{profile.level}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-pill bg-bg-700">
              <div className="h-full rounded-pill bg-court-yellow" style={{ width: `${xpPct}%` }} />
            </div>
            <div className="mt-1 text-right text-xs text-text-lo">
              <span className="num">{profile.xp}</span> / <span className="num">{nextXp}</span> XP
            </div>
            <div className="mt-4 flex gap-2">
              <Button block onClick={() => go('customize')}>
                Customize
              </Button>
              <Button variant="ghost" block onClick={() => go('battlepass')}>
                Battle Pass
              </Button>
            </div>
          </Panel>

          {/* Stats + badges + vault */}
          <div className="space-y-6">
            <div>
              <Eyebrow className="mb-3">Career stats</Eyebrow>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Stat label="Wins" value={profile.wins} />
                <Stat label="Losses" value={profile.losses} />
                <Stat label="Win %" value={`${winRate}`} />
                <Stat label="Hits" value={profile.hits} />
                <Stat label="Captures" value={profile.captures} />
                <Stat label="MVPs" value={profile.mvps} />
              </div>
            </div>

            {/* Chest vault */}
            <div>
              <Eyebrow className="mb-3">Vault</Eyebrow>
              {chestCounts.length === 0 ? (
                <Panel className="text-sm text-text-mid">
                  No chests yet. Level up and complete the battle pass to earn chests.
                </Panel>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {chestCounts.map(([id, count]) => (
                    <div key={id} className="flex items-center gap-3 rounded-md bg-bg-700 p-3">
                      <div
                        className="h-10 w-10 rounded-sm"
                        style={{ background: 'linear-gradient(160deg, var(--wood), var(--wood-deep))' }}
                      />
                      <div>
                        <div className="text-sm font-semibold text-text-hi">{getChest(id)?.name ?? id}</div>
                        <div className="eyebrow text-text-lo">×{count}</div>
                      </div>
                      <Button size="md" onClick={() => setOpeningChest(id)}>
                        Open
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Badges */}
            <div>
              <Eyebrow className="mb-3">Badges</Eyebrow>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {BADGES.map((b) => {
                  const owned = profile.badges.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      className={`flex items-center gap-3 rounded-md border p-3 ${
                        owned ? 'border-court-yellow/50 bg-bg-700' : 'border-bg-600 bg-bg-800/60 opacity-60'
                      }`}
                    >
                      <div
                        className="grid h-9 w-9 shrink-0 place-items-center rounded-pill"
                        style={{ background: owned ? 'var(--court-yellow)' : 'var(--bg-600)' }}
                      >
                        <KeuleIcon className="h-5 w-auto" style={{ color: owned ? 'var(--bg-900)' : 'var(--text-lo)' }} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-text-hi">{getBadge(b.id)?.name}</div>
                        <div className="text-xs text-text-lo">{b.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {openingChest && <ChestOpenModal chestId={openingChest} onClose={() => setOpeningChest(null)} />}
    </div>
  );
}
