import type { ReactNode } from 'react';
import { MatchPhase, Team, getBadge, getCosmetic } from '@shared';
import { useMatchStore, type HudPlayer } from '@/game/runtime/matchStore';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';
import { KeuleIcon } from '@/ui/icons';

/** End-of-match scoreboard with per-team stats, the weighted MVP and rewards. */
export function ResultsOverlay({ onContinue }: { onContinue: () => void }) {
  const hud = useMatchStore((s) => s.hud);
  const awards = useMatchStore((s) => s.awards);
  if (hud.phase !== MatchPhase.Results) return null;

  const winner = hud.matchWinner;
  const mvp = hud.players.find((p) => p.id === hud.mvpId);
  const cols: Team[] = [Team.Blue, Team.Red];

  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center overflow-y-auto bg-bg-900/80 backdrop-blur-sm">
      <div className="panel--court my-8 w-[760px] max-w-[94vw] p-8">
        <div className="text-center">
          <Eyebrow>Match complete</Eyebrow>
          <h1
            className="mt-2 font-display text-5xl font-black"
            style={{ color: winner ? (winner === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)') : 'var(--text-hi)' }}
          >
            {winner ? `${winner === Team.Blue ? 'BLUE' : 'RED'} TEAM WINS` : 'DRAW'}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-6">
            <span className="num text-4xl font-bold text-team-blue">{hud.scores[Team.Blue]}</span>
            <span className="eyebrow text-text-lo">Rounds</span>
            <span className="num text-4xl font-bold text-team-red">{hud.scores[Team.Red]}</span>
          </div>
        </div>

        <CourtRule segmented className="my-6" />

        {/* MVP */}
        {mvp && (
          <div className="mb-6 flex items-center gap-4 rounded-md border border-court-yellow/50 bg-bg-700 p-4">
            <div className="grid h-12 w-12 place-items-center rounded-pill" style={{ background: 'var(--court-yellow)' }}>
              <KeuleIcon className="h-7 w-auto text-bg-900" />
            </div>
            <div>
              <div className="eyebrow text-court-yellow">Most Valuable Player</div>
              <div className="font-display text-2xl font-bold text-text-hi">{mvp.name}</div>
              <div className="text-sm text-text-mid">{hud.mvpReason}</div>
            </div>
          </div>
        )}

        {/* Scoreboards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {cols.map((team) => (
            <TeamBoard
              key={team}
              team={team}
              players={hud.players.filter((p) => p.team === team)}
              mvpId={hud.mvpId}
            />
          ))}
        </div>

        {/* Rewards */}
        {awards && (
          <>
            <CourtRule className="my-6 opacity-40" />
            <div className="rounded-md bg-bg-700 p-4">
              <div className="flex items-center justify-between">
                <Eyebrow className="text-court-yellow">Rewards</Eyebrow>
                <span className="num text-2xl font-bold text-court-yellow">+{awards.xpGained} XP</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-text-mid sm:grid-cols-3">
                {awards.breakdown.map((b, i) => (
                  <div key={i} className="flex justify-between">
                    <span>{b.label}</span>
                    <span className="num text-text-hi">+{b.xp}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {awards.levelAfter > awards.levelBefore && (
                  <Reward color="var(--court-yellow)">
                    Level up → {awards.levelAfter}
                  </Reward>
                )}
                {awards.bpLevelsGained > 0 && (
                  <Reward color="var(--team-blue)">+{awards.bpLevelsGained} Battle Pass</Reward>
                )}
                {awards.chestsAwarded.length > 0 && (
                  <Reward color="var(--ball-pink)">
                    {awards.chestsAwarded.length} chest{awards.chestsAwarded.length > 1 ? 's' : ''}
                  </Reward>
                )}
                {awards.unlockedCosmetics.map((id) => (
                  <Reward key={id} color="var(--court-green)">
                    Unlocked {getCosmetic(id)?.name ?? id}
                  </Reward>
                ))}
                {awards.newBadges.map((id) => (
                  <Reward key={id} color="var(--rarity-epic)">
                    Badge · {getBadge(id)?.name ?? id}
                  </Reward>
                ))}
                {awards.completedChallenges.length > 0 && (
                  <Reward color="var(--court-cyan)">
                    {awards.completedChallenges.length} challenge
                    {awards.completedChallenges.length > 1 ? 's' : ''} done
                  </Reward>
                )}
              </div>
              {!awards.valid && (
                <p className="mt-3 text-xs text-text-lo">
                  Short or inactive match — only participation XP awarded.
                </p>
              )}
            </div>
          </>
        )}

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}

function Reward({ children, color }: { children: ReactNode; color: string }) {
  return (
    <span
      className="eyebrow inline-flex items-center rounded-pill px-3 py-1"
      style={{ color, border: `1px solid ${color}`, background: 'rgba(0,0,0,.2)' }}
    >
      {children}
    </span>
  );
}

function TeamBoard({ team, players, mvpId }: { team: Team; players: HudPlayer[]; mvpId: string | null }) {
  const color = team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)';
  const sorted = [...players].sort(
    (a, b) => b.stats.captures - a.stats.captures || b.stats.hits - a.stats.hits,
  );
  return (
    <div className="rounded-md bg-bg-800 p-4" style={{ borderTop: `3px solid ${color}` }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow" style={{ color }}>
          {team === Team.Blue ? 'Blue team' : 'Red team'}
        </span>
        <div className="flex gap-3 text-[11px] uppercase tracking-wide text-text-lo">
          <span className="w-6 text-right">Cap</span>
          <span className="w-6 text-right">Ret</span>
          <span className="w-6 text-right">Hit</span>
          <span className="w-6 text-right">Out</span>
        </div>
      </div>
      <div className="space-y-1">
        {sorted.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between rounded-sm px-2 py-1.5 ${p.id === mvpId ? 'bg-bg-700' : ''}`}
          >
            <span className="flex items-center gap-2 text-sm text-text-hi">
              {p.isHuman && <span className="h-2 w-2 rounded-pill" style={{ background: color }} />}
              {p.name}
              {p.id === mvpId && <span className="eyebrow text-court-yellow">MVP</span>}
            </span>
            <div className="num flex gap-3 text-sm text-text-mid">
              <span className="w-6 text-right text-text-hi">{p.stats.captures}</span>
              <span className="w-6 text-right">{p.stats.keuleReturns}</span>
              <span className="w-6 text-right">{p.stats.hits}</span>
              <span className="w-6 text-right">{p.stats.deaths}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
