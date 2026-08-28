import { MatchPhase, Team, KeuleState, otherTeam } from '@shared';
import { useMatchStore } from '@/game/runtime/matchStore';
import { useUIStore } from '@/state/uiStore';
import { KeuleIcon } from '@/ui/icons';

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Team score chip with a colour bar (STYLEGUIDE §6.3). */
function ScoreChip({ team, score, align }: { team: Team; score: number; align: 'left' | 'right' }) {
  const color = team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)';
  return (
    <div
      className={`flex items-center gap-3 bg-bg-800/85 px-4 py-2 ${align === 'left' ? 'flex-row' : 'flex-row-reverse'}`}
      style={{ borderTop: `3px solid ${color}` }}
    >
      <span className="num text-4xl font-bold leading-none" style={{ color }}>
        {score}
      </span>
      <span className="eyebrow" style={{ color }}>
        {team === Team.Blue ? 'Blue' : 'Red'}
      </span>
    </div>
  );
}

function KeuleState_({ team, state }: { team: Team; state: KeuleState }) {
  const color = team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)';
  const label =
    state === KeuleState.Safe ? 'SAFE' : state === KeuleState.Carried ? 'STOLEN' : 'DROPPED';
  const stateColor =
    state === KeuleState.Safe ? 'var(--success)' : state === KeuleState.Carried ? 'var(--danger)' : 'var(--warning)';
  return (
    <div className="flex items-center gap-2">
      <KeuleIcon className="h-4 w-auto" style={{ color }} />
      <span className="eyebrow" style={{ color }}>
        {team === Team.Blue ? 'Blue' : 'Red'}
      </span>
      <span className="eyebrow" style={{ color: stateColor }}>
        {label}
      </span>
    </div>
  );
}

/** The gameplay HUD. Grows with combat (M2), Keule + feed (M3). */
export function HUD({ onPause }: { onPause: () => void }) {
  const hud = useMatchStore((s) => s.hud);
  const showHints = useUIStore((s) => s.settings.showControlHints);

  if (!hud.active) return null;

  const human = hud.players.find((p) => p.isHuman);
  const myTeam = human?.team ?? Team.Blue;
  const enemy = otherTeam(myTeam);

  const objective =
    hud.phase === MatchPhase.Preparation
      ? 'Reposition your Keule'
      : `Steal the ${enemy === Team.Blue ? 'blue' : 'red'} Keule`;

  return (
    <div className="pointer-events-none absolute inset-0 select-none p-4 font-ui">
      {/* Top-centre: scores + timer */}
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-stretch gap-2">
        <ScoreChip team={Team.Blue} score={hud.scores[Team.Blue]} align="left" />
        <div className="flex flex-col items-center justify-center bg-bg-800/85 px-4 py-1">
          <span className="eyebrow text-text-lo">
            {hud.phase === MatchPhase.Preparation ? 'Prep' : `Round ${hud.round}`}
          </span>
          <span className="num text-2xl font-bold leading-tight">{fmtTime(hud.phaseTimer)}</span>
        </div>
        <ScoreChip team={Team.Red} score={hud.scores[Team.Red]} align="right" />
      </div>

      {/* Top-left: objective + Keule states */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 bg-bg-800/70 p-3">
        <span className="eyebrow text-court-yellow">Objective</span>
        <span className="text-sm font-semibold text-text-hi">{objective}</span>
        <hr className="court-rule my-1 opacity-40" />
        {hud.keules.map((k) => (
          <KeuleState_ key={k.team} team={k.team} state={k.state} />
        ))}
      </div>

      {/* Top-right: player + pause */}
      <div className="absolute right-4 top-4 flex items-center gap-3">
        {human && (
          <div className="bg-bg-800/70 px-3 py-2 text-right">
            <div className="text-sm font-semibold text-text-hi">{human.name}</div>
            <div className="eyebrow text-text-lo">
              LVL <span className="num">{human.level}</span>
            </div>
          </div>
        )}
        <button
          onClick={onPause}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-md border border-bg-500 bg-bg-800/80 text-text-hi transition hover:bg-bg-700"
          aria-label="Pause"
        >
          <span className="text-lg leading-none">⏸</span>
        </button>
      </div>

      {/* Centre: preparation banner */}
      {hud.phase === MatchPhase.Preparation && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="eyebrow text-court-yellow">Preparation phase</div>
          <div className="mt-2 font-display text-3xl font-extrabold text-text-hi">
            Set your defence
          </div>
          <div className="mt-1 text-sm text-text-mid">Move and reposition your Keule before the round starts.</div>
        </div>
      )}

      {/* Bottom-right: control hints */}
      {showHints && (
        <div className="absolute bottom-4 right-4 flex flex-col items-end gap-1 text-right">
          <Hint k="WASD" v="Move" />
          <Hint k="Mouse" v="Aim" />
          <Hint k="Shift" v="Sprint" />
          <Hint k="Space" v="Dash" />
        </div>
      )}
    </div>
  );
}

function Hint({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-2 bg-bg-800/60 px-2 py-1 text-xs text-text-mid">
      <kbd className="rounded-sm border border-bg-500 bg-bg-700 px-1.5 py-0.5 font-data text-text-hi">{k}</kbd>
      <span>{v}</span>
    </div>
  );
}
