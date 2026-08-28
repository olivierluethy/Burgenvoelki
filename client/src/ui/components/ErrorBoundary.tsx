import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Eyebrow, CourtRule } from '@/ui/primitives';
import { KeuleIcon } from '@/ui/icons';

interface State {
  error: Error | null;
}

/** Catches render/runtime errors and shows a styled recovery screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface for debugging; a real backend would report this.
    console.error('Unhandled error:', error, info.componentStack);
  }

  override render() {
    if (this.state.error) {
      return (
        <div className="arena-backdrop grid h-full w-full place-items-center px-6">
          <div className="panel--court max-w-[520px] text-center">
            <KeuleIcon className="mx-auto h-12 w-auto text-danger" />
            <Eyebrow className="mt-5 text-danger">Something broke</Eyebrow>
            <h1 className="mt-2 font-display text-3xl font-extrabold">The match hit a snag</h1>
            <CourtRule segmented className="mx-auto mt-4 max-w-[220px]" />
            <p className="mt-5 text-sm text-text-mid">
              An unexpected error stopped the game. Reload to jump back into the hall — your
              progress is saved.
            </p>
            <pre className="mt-4 max-h-28 overflow-auto rounded-md bg-bg-900 p-3 text-left text-xs text-text-lo">
              {this.state.error.message}
            </pre>
            <div className="mt-6">
              <Button onClick={() => window.location.reload()}>Reload</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
