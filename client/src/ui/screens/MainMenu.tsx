import { useUIStore } from '@/state/uiStore';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';
import { KeuleIcon } from '@/ui/icons';
import { useProfileStore } from '@/state/profileStore';

/**
 * Main menu — the hero. Opens with the most characteristic thing in the
 * subject's world: the Keule and the painted court-line, set in the Swiss
 * display face. Everything else stays quiet around it (STYLEGUIDE §1, §5).
 */
export function MainMenu() {
  const go = useUIStore((s) => s.go);
  const profile = useProfileStore((s) => s.profile);

  return (
    <div className="arena-backdrop relative h-full w-full overflow-hidden">
      {/* faint centre-line echo */}
      <div
        className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ background: 'linear-gradient(var(--bg-500), transparent)' }}
        aria-hidden
      />

      <div className="relative mx-auto flex h-full max-w-[1120px] flex-col justify-between px-6 py-8 md:px-8 md:py-12">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <KeuleIcon className="h-9 w-auto text-wood" />
            <span className="eyebrow">Online Burgenvölki</span>
          </div>
          <button
            className="eyebrow flex items-center gap-2 rounded-pill border border-bg-500 px-3 py-2 text-text-mid transition hover:bg-bg-700"
            onClick={() => go('profile')}
          >
            <span
              className="grid h-6 w-6 place-items-center rounded-pill text-[11px] font-bold text-text-ink"
              style={{ background: 'var(--team-blue)' }}
            >
              {profile.username.slice(0, 1).toUpperCase()}
            </span>
            {profile.username} · LVL <span className="num">{profile.level}</span>
          </button>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col justify-center">
          <div className="max-w-[760px]">
            <Eyebrow>Swiss gym-hall showdown · Dodgeball × Capture-the-flag</Eyebrow>
            <h1 className="mt-4 font-display text-[16vw] font-black leading-[0.92] tracking-tight md:text-[104px]">
              BURGEN
              <span className="block" style={{ color: 'var(--ball-pink)' }}>
                VÖLKI
              </span>
            </h1>
            <CourtRule segmented className="mt-6 max-w-[560px]" />
            <p className="mt-6 max-w-[520px] font-ui text-lg text-text-mid">
              Knock out the other team, steal their Keule, and carry it home across your
              line. Grab a pink ball and own the hall.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={() => go('setup')}>
                Play singleplayer
              </Button>
              <Button size="lg" variant="ghost" onClick={() => go('customize')}>
                Customize
              </Button>
            </div>
          </div>
        </main>

        {/* Footer nav */}
        <footer className="flex flex-wrap items-center justify-between gap-4">
          <nav className="flex flex-wrap gap-2">
            <MenuLink label="Profile" onClick={() => go('profile')} />
            <MenuLink label="Battle Pass" onClick={() => go('battlepass')} />
            <MenuLink label="Settings" onClick={() => go('settings')} />
          </nav>
          <span className="eyebrow text-text-lo">Vertical slice · v0.1</span>
        </footer>
      </div>
    </div>
  );
}

function MenuLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="eyebrow rounded-md px-3 py-2 text-text-mid transition hover:bg-bg-700 hover:text-text-hi"
    >
      {label}
    </button>
  );
}
