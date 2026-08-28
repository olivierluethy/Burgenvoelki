import { useUIStore } from '@/state/uiStore';
import { Eyebrow, CourtRule, Button, Panel } from '@/ui/primitives';
import { KeuleIcon } from '@/ui/icons';

/** Temporary screen for features arriving in a later milestone (M6+). */
export function PlaceholderScreen({ title, note }: { title: string; note: string }) {
  const go = useUIStore((s) => s.go);
  return (
    <div className="arena-backdrop grid h-full w-full place-items-center px-6">
      <Panel court className="max-w-[520px] text-center">
        <KeuleIcon className="mx-auto h-12 w-auto text-wood" />
        <Eyebrow className="mt-5">Coming soon</Eyebrow>
        <h1 className="mt-2 font-display text-4xl font-extrabold">{title}</h1>
        <CourtRule segmented className="mx-auto mt-4 max-w-[220px]" />
        <p className="mt-5 text-text-mid">{note}</p>
        <div className="mt-7">
          <Button variant="ghost" onClick={() => go('menu')}>
            Back to menu
          </Button>
        </div>
      </Panel>
    </div>
  );
}
