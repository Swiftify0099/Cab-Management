import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  initializeTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  themeMode: 'system',
  setThemeMode: async (mode) => {
    try {
      await AsyncStorage.setItem('@theme_mode', mode);
      set({ themeMode: mode });
    } catch (e) {
      console.error('Failed to save theme mode', e);
    }
  },
  initializeTheme: async () => {
    try {
      const savedMode = await AsyncStorage.getItem('@theme_mode');
      if (savedMode) {
        set({ themeMode: savedMode as ThemeMode });
      }
    } catch (e) {
      console.error('Failed to load theme mode', e);
    }
  },
}));
