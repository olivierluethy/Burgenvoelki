import { create } from 'zustand';

export type FeedKind = 'hit' | 'out' | 'capture' | 'return' | 'invalid' | 'info';

export interface FeedItem {
  id: number;
  kind: FeedKind;
  text: string;
  color: string;
}

interface FxState {
  feed: FeedItem[];
  /** performance.now() timestamps for transient overlays. */
  hitMarkerAt: number;
  hurtAt: number;
  invalidAt: number;
  pushFeed: (kind: FeedKind, text: string, color: string) => void;
  markHit: () => void;
  markHurt: () => void;
  markInvalid: () => void;
  clear: () => void;
}

let uid = 0;

export const useFxStore = create<FxState>((set, get) => ({
  feed: [],
  hitMarkerAt: 0,
  hurtAt: 0,
  invalidAt: 0,
  pushFeed: (kind, text, color) => {
    const id = ++uid;
    set({ feed: [{ id, kind, text, color }, ...get().feed].slice(0, 5) });
    setTimeout(() => set({ feed: get().feed.filter((f) => f.id !== id) }), 4500);
  },
  markHit: () => set({ hitMarkerAt: performance.now() }),
  markHurt: () => set({ hurtAt: performance.now() }),
  markInvalid: () => set({ invalidAt: performance.now() }),
  clear: () => set({ feed: [], hitMarkerAt: 0, hurtAt: 0, invalidAt: 0 }),
}));
