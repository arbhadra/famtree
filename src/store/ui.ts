import { create } from 'zustand';

export type AuthMode = 'signin' | 'signup';

interface UiState {
  authOpen: boolean;
  authMode: AuthMode;
  openAuth: (mode?: AuthMode) => void;
  closeAuth: () => void;
}

export const useUi = create<UiState>((set) => ({
  authOpen: false,
  authMode: 'signin',
  openAuth: (authMode = 'signin') => set({ authOpen: true, authMode }),
  closeAuth: () => set({ authOpen: false }),
}));
