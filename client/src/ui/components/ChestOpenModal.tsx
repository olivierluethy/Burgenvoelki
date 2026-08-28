import { useState } from 'react';
import { getChest, getCosmetic, openChest, type ChestOpenResult, type Rarity } from '@shared';
import { useProfileStore } from '@/state/profileStore';
import { Button, Eyebrow } from '@/ui/primitives';
import { audio } from '@/audio/AudioService';

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--rarity-common)',
  rare: 'var(--rarity-rare)',
  epic: 'var(--rarity-epic)',
  legendary: 'var(--rarity-legendary)',
};

type Stage = 'ready' | 'opening' | 'revealed';

/** Chest opening: build-up animation, rarity reveal, item reveal and SFX. */
export function ChestOpenModal({ chestId, onClose }: { chestId: string; onClose: () => void }) {
  const setProfile = useProfileStore((s) => s.setProfile);
  const [stage, setStage] = useState<Stage>('ready');
  const [result, setResult] = useState<ChestOpenResult | null>(null);
  const chest = getChest(chestId);

  const open = () => {
    setStage('opening');
    audio.play('ui');
    setTimeout(() => {
      const profile = structuredClone(useProfileStore.getState().profile);
      const r = openChest(profile, chestId, () => Math.random());
      if (!r) {
        onClose();
        return;
      }
      setProfile(profile);
      setResult(r);
      setStage('revealed');
      audio.play(r.rarity === 'legendary' ? 'victory' : r.rarity === 'common' ? 'keulePickup' : 'capture');
    }, 850);
  };

  const cosmetic = result ? getCosmetic(result.cosmeticId) : null;
  const rarityColor = result ? RARITY_COLOR[result.rarity] : 'var(--wood)';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg-900/80 backdrop-blur-sm">
      <div className="panel--court w-[420px] max-w-[92vw] p-8 text-center">
        <Eyebrow>{chest?.name ?? 'Chest'}</Eyebrow>

        <div className="my-8 grid place-items-center">
          <div
            className={`relative h-32 w-32 rounded-lg ${stage === 'opening' ? 'animate-[chestShake_.15s_ease-in-out_infinite]' : ''}`}
            style={{
              background: stage === 'revealed' ? rarityColor : 'linear-gradient(160deg, var(--wood), var(--wood-deep))',
              boxShadow: stage === 'revealed' ? `0 0 60px ${rarityColor}` : 'var(--tw-shadow, 0 6px 20px rgba(0,0,0,.45))',
              transition: 'background .3s, box-shadow .3s',
            }}
          >
            {stage !== 'revealed' && (
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 bg-bg-900/40" />
            )}
            {stage === 'revealed' && cosmetic && (
              <div className="absolute inset-0 grid place-items-center">
                <div
                  className="h-16 w-16 rounded-pill"
                  style={{ background: `linear-gradient(135deg, ${cosmetic.colors[0]}, ${cosmetic.colors[1]})` }}
                />
              </div>
            )}
          </div>
        </div>

        {stage === 'revealed' && result && cosmetic ? (
          <>
            <div className="eyebrow" style={{ color: rarityColor }}>
              {result.rarity}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-text-hi">{cosmetic.name}</div>
            {result.duplicate ? (
              <p className="mt-2 text-sm text-text-mid">
                Duplicate — converted to <span className="num text-court-yellow">{result.currencyAwarded}</span> coins
              </p>
            ) : (
              <p className="mt-2 text-sm text-success">New cosmetic unlocked!</p>
            )}
            <div className="mt-6">
              <Button block onClick={onClose}>
                Collect
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-text-mid">
              {stage === 'opening' ? 'Opening…' : 'A cosmetic awaits. Open it?'}
            </p>
            <div className="mt-6 flex gap-3">
              <Button block onClick={open} disabled={stage === 'opening'}>
                Open chest
              </Button>
              {stage === 'ready' && (
                <Button variant="ghost" block onClick={onClose}>
                  Later
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
