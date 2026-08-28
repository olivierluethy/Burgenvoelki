import { Eyebrow } from '@/ui/primitives';

/** Full-screen loading state with the court-line spinner (STYLEGUIDE §7). */
export function Loader({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="arena-backdrop grid h-full w-full place-items-center">
      <div className="flex flex-col items-center gap-4">
        <div className="court-spinner" />
        <Eyebrow>{label}</Eyebrow>
      </div>
    </div>
  );
}
