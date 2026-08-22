import React, { createContext, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, Theme } from './lightTheme';
import { darkTheme } from './darkTheme';
import { useThemeStore } from '../store/themeStore';

interface ThemeContextProps {
  theme: Theme;
  isDark: boolean;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  themeMode: 'light' | 'dark' | 'system';
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: darkTheme,
  isDark: true,
  setThemeMode: () => {},
  themeMode: 'system',
});

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const { themeMode, setThemeMode, initializeTheme } = useThemeStore();

  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  const isDark =
    themeMode === 'dark' ||
    (themeMode === 'system' && (systemColorScheme === 'dark' || !systemColorScheme));

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, setThemeMode, themeMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

