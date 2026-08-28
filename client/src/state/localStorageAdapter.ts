import type { PersistenceAdapter, PersistedRoot } from '@shared';

const KEY = 'burgenvoelki.save.v1';

/** localStorage-backed PersistenceAdapter for the singleplayer slice. */
export const localStorageAdapter: PersistenceAdapter = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedRoot;
    } catch {
      return null;
    }
  },
  save(root: PersistedRoot) {
    try {
      localStorage.setItem(KEY, JSON.stringify(root));
    } catch {
      /* storage unavailable (private mode) — run without persistence */
    }
  },
  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  },
};
