import { useState } from 'react';
import {
  cosmeticsBySlot,
  equipCosmetic,
  type Cosmetic,
  type CosmeticSlot,
  type Rarity,
} from '@shared';
import { useUIStore } from '@/state/uiStore';
import { useProfileStore } from '@/state/profileStore';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';
import { CharacterPreview } from '@/ui/components/CharacterPreview';
import { audio } from '@/audio/AudioService';

const SLOTS: { slot: CosmeticSlot; label: string }[] = [
  { slot: 'outfit', label: 'Outfit' },
  { slot: 'trail', label: 'Trail' },
  { slot: 'hat', label: 'Hat' },
];

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

/** Data-driven Customize screen with a live character preview. */
export function CustomizeScreen() {
  const go = useUIStore((s) => s.go);
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);
  const [tab, setTab] = useState<CosmeticSlot>('outfit');

  const equip = (c: Cosmetic) => {
    if (!profile.unlocked.includes(c.id)) return;
    const next = structuredClone(profile);
    if (equipCosmetic(next, c.id)) {
      setProfile(next);
      audio.unlock();
      audio.play('ui');
    }
  };

  const items = cosmeticsBySlot(tab);

  return (
    <div className="arena-backdrop h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[1120px] px-6 py-8 md:px-8">
        <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={() => go('menu')}>
          ← Back to menu
        </button>
        <Eyebrow className="mt-6">Customize</Eyebrow>
        <h1 className="mt-2 font-display text-5xl font-extrabold">Your look</h1>
        <CourtRule segmented className="mt-4 max-w-[360px]" />

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[380px_1fr]">
          {/* Live preview */}
          <div>
            <CharacterPreview
              outfit={profile.equipped.outfit}
              hat={profile.equipped.hat}
              className="aspect-[3/4] w-full"
            />
            <p className="mt-3 text-center text-xs text-text-lo">
              Cosmetics are visual only — never pay-to-win. Team colours stay blue vs red in match.
            </p>
          </div>

          {/* Cosmetic grid */}
          <div>
            <div className="flex gap-2">
              {SLOTS.map((s) => (
                <button
                  key={s.slot}
                  onClick={() => setTab(s.slot)}
                  className={`rounded-md px-4 py-2 font-ui text-sm font-semibold transition ${
                    tab === s.slot ? 'bg-team-blue text-text-hi' : 'bg-bg-700 text-text-mid hover:bg-bg-600'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {items.map((c) => {
                const owned = profile.unlocked.includes(c.id);
                const equipped = profile.equipped[c.slot] === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => equip(c)}
                    disabled={!owned}
                    className={`rounded-md border p-3 text-left transition ${
                      equipped
                        ? 'border-team-blue bg-bg-700 shadow-glow-blue'
                        : owned
                          ? 'border-bg-600 bg-bg-800 hover:border-bg-500 hover:bg-bg-700'
                          : 'border-bg-700 bg-bg-800/60 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className="mb-2 h-14 w-full rounded-sm"
                      style={{ background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})` }}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text-hi">{c.name}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="eyebrow" style={{ color: RARITY_COLOR[c.rarity] }}>
                        {c.rarity}
                      </span>
                      {equipped ? (
                        <span className="eyebrow text-success">Equipped</span>
                      ) : owned ? (
                        <span className="eyebrow text-text-lo">Equip</span>
                      ) : (
                        <span className="eyebrow text-text-lo">🔒 {c.source}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="ghost" onClick={() => go('profile')}>
                View profile
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
