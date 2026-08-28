import { useState, type ReactNode } from 'react';
import { Difficulty, Team } from '@shared';
import { useUIStore } from '@/state/uiStore';
import { useProfileStore } from '@/state/profileStore';
import { useNetStore } from '@/net/netStore';
import { net } from '@/net/NetworkManager';
import { NetGameScreen } from './NetGameScreen';
import { Button, Eyebrow, CourtRule, Panel } from '@/ui/primitives';
import { Loader } from '@/ui/components/Loader';
import { KeuleIcon } from '@/ui/icons';

/** Multiplayer flow: menu → lobby → in-match, switched on connection status. */
export function MultiplayerScreen() {
  const status = useNetStore((s) => s.status);
  switch (status) {
    case 'connecting':
      return <Loader label="Connecting to the hall" />;
    case 'ingame':
      return <NetGameScreen />;
    case 'lobby':
      return <Lobby />;
    case 'error':
      return <ErrorPanel />;
    default:
      return <MpMenu />;
  }
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="arena-backdrop h-full w-full overflow-y-auto">
      <div className="mx-auto max-w-[820px] px-6 py-10">{children}</div>
    </div>
  );
}

function MpMenu() {
  const go = useUIStore((s) => s.go);
  const username = useProfileStore((s) => s.profile.username);
  const [name, setName] = useState(username);
  const [code, setCode] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.Normal);
  const [friendlyFire, setFriendlyFire] = useState(false);

  return (
    <Shell>
      <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={() => go('menu')}>
        ← Back to menu
      </button>
      <Eyebrow className="mt-6">Multiplayer</Eyebrow>
      <h1 className="mt-2 font-display text-5xl font-extrabold">Play online</h1>
      <CourtRule segmented className="mt-4 max-w-[320px]" />

      <label className="mt-8 block">
        <span className="eyebrow">Your name</span>
        <input
          value={name}
          maxLength={16}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full rounded-sm border border-bg-500 bg-bg-700 px-3 py-2 text-text-hi outline-none focus:border-team-blue"
        />
      </label>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel court>
          <Eyebrow className="text-court-green">Quick match</Eyebrow>
          <p className="mt-2 text-sm text-text-mid">Jump into an open room, or start a fresh one. Empty slots are filled by bots.</p>
          <div className="mt-4">
            <Button block onClick={() => net.quickMatch(name || 'Player')}>
              Find a match
            </Button>
          </div>
        </Panel>

        <Panel court>
          <Eyebrow className="text-court-cyan">Join by code</Eyebrow>
          <input
            value={code}
            maxLength={5}
            placeholder="K7X4P"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="mt-3 w-full rounded-sm border border-bg-500 bg-bg-700 px-3 py-2 font-data text-lg tracking-[0.3em] text-text-hi outline-none focus:border-team-blue"
          />
          <div className="mt-3">
            <Button block variant="ghost" disabled={code.length < 5} onClick={() => net.joinByCode(name || 'Player', code)}>
              Join room
            </Button>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <Eyebrow className="text-ball-pink">Create private room</Eyebrow>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label>
            <span className="eyebrow">Team size</span>
            <div className="mt-2 flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setTeamSize(n)}
                  className={`num h-11 w-11 rounded-md border font-bold ${teamSize === n ? 'border-team-blue bg-bg-700' : 'border-bg-600 bg-bg-800'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </label>
          <label>
            <span className="eyebrow">Bot difficulty</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="mt-2 block rounded-sm border border-bg-500 bg-bg-700 px-3 py-2 text-text-hi"
            >
              {Object.values(Difficulty).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2">
            <input type="checkbox" checked={friendlyFire} onChange={(e) => setFriendlyFire(e.target.checked)} className="h-5 w-5 accent-[var(--team-blue)]" />
            <span className="text-sm text-text-hi">Friendly fire</span>
          </label>
        </div>
        <div className="mt-5">
          <Button variant="pink" onClick={() => net.createRoom(name || 'Player', { teamSize, botDifficulty: difficulty, friendlyFire })}>
            Create room
          </Button>
        </div>
      </Panel>
    </Shell>
  );
}

function Lobby() {
  const lobby = useNetStore((s) => s.lobby);
  const mySession = useNetStore((s) => s.sessionId);
  if (!lobby) return <Loader label="Loading lobby" />;
  const isOwner = lobby.ownerSessionId === mySession;
  const me = lobby.players.find((p) => p.sessionId === mySession);

  return (
    <Shell>
      <button className="eyebrow text-text-mid transition hover:text-text-hi" onClick={() => net.leave()}>
        ← Leave lobby
      </button>
      <div className="mt-6 flex items-center justify-between">
        <div>
          <Eyebrow>Lobby</Eyebrow>
          <h1 className="mt-1 font-display text-4xl font-extrabold">Room ready</h1>
        </div>
        <div className="text-right">
          <span className="eyebrow text-text-lo">Room code</span>
          <div className="num text-3xl font-bold tracking-[0.3em] text-court-yellow">{lobby.code}</div>
        </div>
      </div>
      <CourtRule segmented className="mt-4" />

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[Team.Blue, Team.Red].map((team) => (
          <div key={team} className="rounded-lg bg-bg-800 p-4" style={{ borderTop: `3px solid ${team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)'}` }}>
            <div className="mb-3 flex items-center justify-between">
              <span className="eyebrow" style={{ color: team === Team.Blue ? 'var(--team-blue)' : 'var(--team-red)' }}>
                {team === Team.Blue ? 'Blue team' : 'Red team'}
              </span>
              <span className="eyebrow text-text-lo">
                {lobby.players.filter((p) => p.team === team).length}/{lobby.settings.teamSize}
              </span>
            </div>
            <div className="space-y-2">
              {lobby.players
                .filter((p) => p.team === team)
                .map((p) => (
                  <div key={p.sessionId} className="flex items-center justify-between rounded-md bg-bg-700 px-3 py-2">
                    <span className="flex items-center gap-2 text-sm text-text-hi">
                      {p.isOwner && <KeuleIcon className="h-4 w-auto text-court-yellow" />}
                      {p.name}
                      {p.sessionId === mySession && <span className="eyebrow text-text-lo">you</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="eyebrow" style={{ color: p.ready ? 'var(--success)' : 'var(--text-lo)' }}>
                        {p.ready ? 'Ready' : 'Not ready'}
                      </span>
                      {isOwner && (
                        <button
                          className="eyebrow rounded-sm border border-bg-500 px-2 py-1 text-text-mid hover:bg-bg-600"
                          onClick={() => net.reassign(p.sessionId, team === Team.Blue ? Team.Red : Team.Blue)}
                        >
                          swap
                        </button>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant={me?.ready ? 'ghost' : 'primary'} onClick={() => net.toggleReady()}>
          {me?.ready ? 'Cancel ready' : 'Ready up'}
        </Button>
        {isOwner ? (
          <Button variant="pink" onClick={() => net.startMatch()}>
            Start match
          </Button>
        ) : (
          <span className="text-sm text-text-mid">Waiting for the host to start…</span>
        )}
        <span className="ml-auto text-sm text-text-lo">
          {lobby.settings.teamSize}v{lobby.settings.teamSize} · {lobby.settings.rounds} rounds ·{' '}
          {lobby.settings.botDifficulty} bots
        </span>
      </div>
    </Shell>
  );
}

function ErrorPanel() {
  const error = useNetStore((s) => s.error);
  const go = useUIStore((s) => s.go);
  return (
    <Shell>
      <Panel court className="text-center">
        <KeuleIcon className="mx-auto h-10 w-auto text-danger" />
        <Eyebrow className="mt-4 text-danger">Connection problem</Eyebrow>
        <p className="mt-3 text-text-mid">{error ?? 'Could not reach the server.'}</p>
        <p className="mt-2 text-xs text-text-lo">
          Make sure the server is running: <code className="text-text-mid">pnpm server:dev</code>
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => useNetStore.getState().reset()}>Try again</Button>
          <Button variant="ghost" onClick={() => { useNetStore.getState().reset(); go('menu'); }}>
            Back to menu
          </Button>
        </div>
      </Panel>
    </Shell>
  );
}
