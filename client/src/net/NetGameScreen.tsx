import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import { CAMERA, MatchPhase, Team } from '@shared';
import { Arena } from '@/game/scene/Arena';
import { Props } from '@/game/scene/Props';
import { Lighting } from '@/game/scene/Lighting';
import { inputManager } from '@/game/input/inputManager';
import { audio } from '@/audio/AudioService';
import { net } from '@/net/NetworkManager';
import { useNetStore } from '@/net/netStore';
import { NetScene } from './NetScene';
import { NetHUD } from './NetHUD';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';

/** In-match multiplayer view: renders authoritative state, streams input. */
export function NetGameScreen() {
  const hud = useNetStore((s) => s.hud);

  useEffect(() => {
    inputManager.attach();
    audio.unlock();
    return () => inputManager.detach();
  }, []);

  const results = hud?.phase === MatchPhase.Results;

  return (
    <div className="relative h-full w-full bg-bg-850">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [CAMERA.offset.x, CAMERA.offset.y, CAMERA.offset.z], fov: CAMERA.fov }}>
        <color attach="background" args={['#1a160f']} />
        <fog attach="fog" args={['#1a160f', 34, 62]} />
        <Lighting />
        <Arena />
        <Props />
        <NetScene />
      </Canvas>

      <NetHUD />

      <div className="pointer-events-none absolute inset-0 p-4">
        <div className="pointer-events-auto flex justify-end">
          <Button variant="ghost" onClick={() => net.leave()}>
            Leave
          </Button>
        </div>
      </div>

      {results && hud && <NetResults />}
    </div>
  );
}

function NetResults() {
  const hud = useNetStore((s) => s.hud)!;
  const winner = hud.matchWinner;
  const mvp = hud.players.find((p) => p.id === hud.mvpId);
  return (
    <div className="pointer-events-auto absolute inset-0 grid place-items-center overflow-y-auto bg-bg-900/80 backdrop-blur-sm">
      <div className="panel--court my-8 w-[720px] max-w-[94vw] p-8">
        <div className="text-center">
          <Eyebrow>Match complete</Eyebrow>
          <h1
            className="mt-2 font-display text-5xl font-black"
            style={{ color: winner === 'blue' ? 'var(--team-blue)' : winner === 'red' ? 'var(--team-red)' : 'var(--text-hi)' }}
          >
            {winner ? `${winner.toUpperCase()} TEAM WINS` : 'DRAW'}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-6">
            <span className="num text-4xl font-bold text-team-blue">{hud.scoreBlue}</span>
            <span className="eyebrow text-text-lo">Rounds</span>
            <span className="num text-4xl font-bold text-team-red">{hud.scoreRed}</span>
          </div>
        </div>
        <CourtRule segmented className="my-6" />
        {mvp && (
          <div className="mb-6 rounded-md border border-court-yellow/50 bg-bg-700 p-4 text-center">
            <div className="eyebrow text-court-yellow">MVP</div>
            <div className="font-display text-2xl font-bold">{mvp.name}</div>
            <div className="text-sm text-text-mid">{hud.mvpReason}</div>
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[Team.Blue, Team.Red].map((team) => (
            <div key={team} className="rounded-md bg-bg-800 p-4" style={{ borderTop: `3px solid ${team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)'}` }}>
              <div className="mb-2 eyebrow" style={{ color: team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)' }}>
                {team === Team.Blue ? 'Blue team' : 'Red team'}
              </div>
              {hud.players
                .filter((p) => p.team === team)
                .sort((a, b) => b.captures - a.captures || b.hits - a.hits)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-text-hi">
                      {p.name}
                      {p.id === hud.mvpId && <span className="eyebrow ml-2 text-court-yellow">MVP</span>}
                    </span>
                    <span className="num text-text-mid">
                      {p.captures}c · {p.hits}h · {p.deaths}o
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => net.leave()}>
            Back to menu
          </Button>
        </div>
      </div>
    </div>
  );
}
