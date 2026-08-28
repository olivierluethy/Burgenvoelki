import { createContext, useContext, type ReactNode } from 'react';
import type { GameRuntime } from './GameRuntime';

/**
 * The runtime is created and owned by GameScreen. Because R3F's Canvas is a
 * separate reconciler root, React context does not cross it automatically —
 * so we bridge the same instance explicitly on both sides with ProvideRuntime.
 */
const RuntimeContext = createContext<GameRuntime | null>(null);

export function ProvideRuntime({
  runtime,
  children,
}: {
  runtime: GameRuntime;
  children: ReactNode;
}) {
  return <RuntimeContext.Provider value={runtime}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): GameRuntime {
  const r = useContext(RuntimeContext);
  if (!r) throw new Error('useRuntime must be used within a ProvideRuntime');
  return r;
}
