import { Difficulty } from '@shared';
import { useUIStore } from '@/state/uiStore';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';
import { KeuleIcon } from '@/ui/icons';

const DIFFICULTIES: { id: Difficulty; label: string; blurb: string }[] = [
  { id: Difficulty.Easy, label: 'Easy', blurb: 'Slow to react, loose aim. Learn the ropes.' },
  { id: Difficulty.Normal, label: 'Normal', blurb: 'Reads the game, plays the objective.' },
  { id: Difficulty.Hard, label: 'Hard', blurb: 'Leads throws, uses cover, coordinates.' },
  { id: Difficulty.Expert, label: 'Expert', blurb: 'Sharp, relentless, well-drilled team play.' },
];

const TEAM_SIZES = [2, 3, 4, 5];

/** Singleplayer setup: pick difficulty and team size, then enter the arena. */
export function SetupScreen() {
  const go = useUIStore((s) => s.go);
  const config = useUIStore((s) => s.matchConfig);
  const setConfig = useUIStore((s) => s.setMatchConfig);

  return (
    <div className="arena-backdrop h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-8">
        <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={() => go('menu')}>
          ← Back to menu
        </button>

        <div className="mt-6 flex items-center gap-3">
          <KeuleIcon className="h-8 w-auto text-wood" />
          <Eyebrow>Singleplayer setup</Eyebrow>
        </div>
        <h1 className="mt-3 font-display text-5xl font-extrabold md:text-6xl">Set up your match</h1>
        <CourtRule segmented className="mt-5 max-w-[460px]" />

        {/* Difficulty */}
        <section className="mt-10">
          <Eyebrow className="mb-3">Bot difficulty</Eyebrow>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DIFFICULTIES.map((d) => {
              const active = config.difficulty === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => setConfig({ difficulty: d.id })}
                  className={`rounded-lg border p-4 text-left transition ${
                    active
                      ? 'border-team-blue bg-bg-700 shadow-glow-blue'
                      : 'border-bg-600 bg-bg-800 hover:border-bg-500 hover:bg-bg-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xl font-bold">{d.label}</span>
                    {active && (
                      <span
                        className="h-3 w-3 rounded-pill"
                        style={{ background: 'var(--team-blue)', boxShadow: 'var(--tw-shadow)' }}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-sm text-text-mid">{d.blurb}</p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-lo">
            Difficulty scales decision quality — reaction, prediction, cover use and teamwork —
            never raw speed or perfect aim.
          </p>
        </section>

        {/* Team size */}
        <section className="mt-10">
          <Eyebrow className="mb-3">Players per team</Eyebrow>
          <div className="flex flex-wrap gap-3">
            {TEAM_SIZES.map((n) => {
              const active = config.teamSize === n;
              return (
                <button
                  key={n}
                  onClick={() => setConfig({ teamSize: n })}
                  className={`num grid h-16 w-16 place-items-center rounded-lg border text-2xl font-bold transition ${
                    active
                      ? 'border-team-blue bg-bg-700 text-text-hi shadow-glow-blue'
                      : 'border-bg-600 bg-bg-800 text-text-mid hover:bg-bg-700'
                  }`}
                >
                  {n}v{n}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-text-lo">
            You lead the blue team. Remaining slots are filled by bots on both sides.
          </p>
        </section>

        <div className="mt-12 flex items-center gap-3">
          <Button size="lg" onClick={() => go('game')}>
            Enter the arena
          </Button>
          <Button size="lg" variant="ghost" onClick={() => go('menu')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
