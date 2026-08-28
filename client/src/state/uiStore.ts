import { create } from 'zustand';
import { DEFAULT_MATCH_CONFIG, Difficulty, type MatchConfig } from '@shared';

/** Top-level screens the app can show. */
export type Screen =
  | 'menu'
  | 'setup'
  | 'game'
  | 'multiplayer'
  | 'profile'
  | 'customize'
  | 'battlepass'
  | 'settings';

export interface Settings {
  masterVolume: number; // 0..1
  sfxVolume: number; // 0..1
  cameraShake: number; // 0..1
  showControlHints: boolean;
}

interface UIState {
  screen: Screen;
  /** Screen to return to when closing an overlay (settings/profile). */
  returnTo: Screen;
  matchConfig: MatchConfig;
  settings: Settings;
  go: (screen: Screen) => void;
  openOverlay: (screen: Screen) => void;
  closeOverlay: () => void;
  setMatchConfig: (patch: Partial<MatchConfig>) => void;
  setSettings: (patch: Partial<Settings>) => void;
}

const DEFAULT_SETTINGS: Settings = {
  masterVolume: 0.8,
  sfxVolume: 0.9,
  cameraShake: 0.6,
  showControlHints: true,
};

export const useUIStore = create<UIState>((set, get) => ({
  screen: 'menu',
  returnTo: 'menu',
  matchConfig: { ...DEFAULT_MATCH_CONFIG, difficulty: Difficulty.Normal },
  settings: { ...DEFAULT_SETTINGS },
  go: (screen) => set({ screen }),
  openOverlay: (screen) => set({ returnTo: get().screen, screen }),
  closeOverlay: () => set({ screen: get().returnTo }),
  setMatchConfig: (patch) => set({ matchConfig: { ...get().matchConfig, ...patch } }),
  setSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),
}));
