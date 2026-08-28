import { useUIStore } from '@/state/uiStore';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';
import { KeuleIcon } from '@/ui/icons';

/** Pause menu shown when the match is halted (Esc). */
export function PauseOverlay({ onResume, onLeave }: { onResume: () => void; onLeave: () => void }) {
  const openOverlay = useUIStore((s) => s.openOverlay);

  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center bg-bg-900/70 backdrop-blur-sm">
      <div className="panel--court w-[380px] max-w-[90vw] p-8 text-center">
        <KeuleIcon className="mx-auto h-10 w-auto text-wood" />
        <Eyebrow className="mt-4">Paused</Eyebrow>
        <h2 className="mt-2 font-display text-3xl font-extrabold">Match paused</h2>
        <CourtRule segmented className="mx-auto mt-4 max-w-[180px]" />
        <div className="mt-7 flex flex-col gap-3">
          <Button size="lg" block onClick={onResume}>
            Resume
          </Button>
          <Button variant="ghost" block onClick={() => openOverlay('settings')}>
            Settings
          </Button>
          <Button variant="danger" block onClick={onLeave}>
            Leave match
          </Button>
        </div>
      </div>
    </div>
  );
}
