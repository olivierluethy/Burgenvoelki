import { create } from 'zustand';
import {
  defaultProfile,
  PROFILE_SCHEMA_VERSION,
  type PlayerProfile,
  type PersistedRoot,
} from '@shared';
import { localStorageAdapter } from './localStorageAdapter';

const adapter = localStorageAdapter;

function loadProfile(): PlayerProfile {
  const root = adapter.load();
  if (root && root.profile) {
    return { ...defaultProfile(root.profile.username), ...root.profile };
  }
  return defaultProfile();
}

interface ProfileState {
  profile: PlayerProfile;
  /** Replace the whole profile (e.g. after applying match rewards). */
  setProfile: (next: PlayerProfile) => void;
  /** Apply a partial patch and persist. */
  patch: (patch: Partial<PlayerProfile>) => void;
  rename: (username: string) => void;
  reset: () => void;
}

function persist(profile: PlayerProfile) {
  const root: PersistedRoot = { version: PROFILE_SCHEMA_VERSION, profile };
  adapter.save(root);
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: loadProfile(),
  setProfile: (next) => {
    persist(next);
    set({ profile: next });
  },
  patch: (patch) => {
    const next = { ...get().profile, ...patch };
    persist(next);
    set({ profile: next });
  },
  rename: (username) => get().patch({ username }),
  reset: () => {
    const next = defaultProfile();
    persist(next);
    set({ profile: next });
  },
}));
