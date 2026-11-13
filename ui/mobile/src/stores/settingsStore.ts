import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

/** Build-time default for demo mode (e.g. `EXPO_PUBLIC_DEMO_MODE=true npx expo export --platform web`). */
export const DEFAULT_DEMO_MODE = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

export interface SettingsState {
  serverUrl: string;
  /** When true, skip the sensing server and stream simulated frames. */
  demoMode: boolean;
  rssiScanEnabled: boolean;
  theme: Theme;
  alertSoundEnabled: boolean;
  setServerUrl: (url: string) => void;
  setDemoMode: (value: boolean) => void;
  setRssiScanEnabled: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  setAlertSoundEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      serverUrl: 'http://localhost:3000',
      demoMode: DEFAULT_DEMO_MODE,
      rssiScanEnabled: false,
      theme: 'system',
      alertSoundEnabled: true,

      setServerUrl: (url) => {
        set({ serverUrl: url });
      },

      setDemoMode: (value) => {
        set({ demoMode: value });
      },

      setRssiScanEnabled: (value) => {
        set({ rssiScanEnabled: value });
      },

      setTheme: (theme) => {
        set({ theme });
      },

      setAlertSoundEnabled: (value) => {
        set({ alertSoundEnabled: value });
      },
    }),
    {
      name: 'wifi-densepose-settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
