import { MatchPhase, Team, otherTeam } from '@shared';
import { useNetStore } from '@/net/netStore';
import { useFxStore } from '@/game/fx/fxStore';
import { net } from '@/net/NetworkManager';

function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

/** Trimmed HUD for the networked match, driven by authoritative state. */
export function NetHUD() {
  const hud = useNetStore((s) => s.hud);
  const fx = useFxStore();
  if (!hud) return null;

  const me = hud.players.find((p) => p.id === net.myPlayerId);
  const myTeam = me?.team ?? Team.Blue;
  const enemy = otherTeam(myTeam);
  const now = performance.now();
  const isOut = me?.life === 'out';
  const showHit = now - fx.hitMarkerAt < 650;
  const showHurt = now - fx.hurtAt < 420;
  const roundEnd = hud.phase === MatchPhase.RoundEnd;

  return (
    <div className="pointer-events-none absolute inset-0 select-none p-4 font-ui">
      {/* scores + timer */}
      <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-stretch gap-2">
        <div className="flex items-center gap-2 bg-bg-800/85 px-4 py-2" style={{ borderTop: '3px solid var(--team-blue)' }}>
          <span className="num text-3xl font-bold text-team-blue">{hud.scoreBlue}</span>
          <span className="eyebrow text-team-blue">Blue</span>
        </div>
        <div className="flex flex-col items-center justify-center bg-bg-800/85 px-4 py-1">
          <span className="eyebrow text-text-lo">
            {hud.phase === MatchPhase.Preparation ? 'Prep' : `Round ${hud.round}`}
          </span>
          <span className="num text-2xl font-bold">{fmt(hud.phaseTimer)}</span>
        </div>
        <div className="flex flex-row-reverse items-center gap-2 bg-bg-800/85 px-4 py-2" style={{ borderTop: '3px solid var(--team-red)' }}>
          <span className="num text-3xl font-bold text-team-red">{hud.scoreRed}</span>
          <span className="eyebrow text-team-red">Red</span>
        </div>
      </div>

      {/* objective + keules */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 bg-bg-800/70 p-3">
        <span className="eyebrow text-court-yellow">Objective</span>
        <span className="text-sm font-semibold text-text-hi">
          {hud.phase === MatchPhase.Preparation ? 'Reposition your Keule' : `Steal the ${enemy} Keule`}
        </span>
        <hr className="court-rule my-1 opacity-40" />
        {hud.keules.map((k) => (
          <div key={k.team} className="flex items-center gap-2">
            <span className="eyebrow" style={{ color: k.team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)' }}>
              {k.team}
            </span>
            <span
              className="eyebrow"
              style={{ color: k.state === 'SAFE' ? 'var(--success)' : k.state === 'CARRIED' ? 'var(--danger)' : 'var(--warning)' }}
            >
              {k.state === 'CARRIED' ? 'STOLEN' : k.state}
            </span>
          </div>
        ))}
      </div>

      {/* feed */}
      <div className="absolute bottom-4 left-4 flex flex-col-reverse gap-1">
        {fx.feed.map((f) => (
          <div key={f.id} className="bg-bg-900/70 px-3 py-1.5 text-sm" style={{ borderLeft: `3px solid ${f.color}` }}>
            <span className="text-text-hi">{f.text}</span>
          </div>
        ))}
      </div>

      {showHit && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[120%] font-display text-2xl font-black text-ball-pink">
          +1 HIT
        </div>
      )}
      {showHurt && (
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 40%, rgba(226,59,59,.45))' }} />
      )}

      {roundEnd && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="absolute inset-0 bg-bg-900/50" />
          <div className="relative text-center">
            <div className="eyebrow text-text-mid">Round {hud.round}</div>
            <div
              className="mt-2 font-display text-6xl font-black"
              style={{ color: hud.lastRoundWinner === 'blue' ? 'var(--team-blue)' : hud.lastRoundWinner === 'red' ? 'var(--team-red)' : 'var(--text-hi)' }}
            >
              {hud.lastRoundWinner ? `${hud.lastRoundWinner.toUpperCase()} WINS` : 'DRAW'}
            </div>
            <div className="mt-2 text-text-mid">{hud.lastRoundReason}</div>
          </div>
        </div>
      )}

      {isOut && me && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% 50%, transparent 30%, rgba(226,59,59,.35))' }} />
          <div className="relative text-center">
            <div className="font-display text-7xl font-black text-danger">OUT</div>
            <div className="mt-2 eyebrow text-text-mid">Back in</div>
            <div className="num text-4xl font-bold text-text-hi">{Math.ceil(me.respawnIn)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
