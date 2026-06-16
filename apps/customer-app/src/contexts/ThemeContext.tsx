/**
 * Customer App — ThemeContext
 * Provides theme (dark/light) to entire app.
 * - Auto-detects system preference (useColorScheme)
 * - Allows manual toggle (persisted to AsyncStorage)
 * - useTheme() hook for all components
 */
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { DarkTheme } from '../theme/darkTheme'
import { LightTheme } from '../theme/lightTheme'
import type { Theme } from '../theme/darkTheme'

const THEME_KEY = '@customer_app_theme'

type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
  theme:       Theme
  isDark:      boolean
  mode:        ThemeMode
  toggleTheme: () => void
  setMode:     (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')

  // Load persisted preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setModeState(saved)
        }
      })
      .catch(() => {})
  }, [])

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode)
    try {
      await AsyncStorage.setItem(THEME_KEY, newMode)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setModeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      AsyncStorage.setItem(THEME_KEY, next).catch(() => {})
      return next
    })
  }, [])

  // Resolve actual dark/light
  const isDark = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark'
    return mode === 'dark'
  }, [mode, systemScheme])

  const theme = useMemo(
    () => (isDark ? DarkTheme : LightTheme) as Theme,
    [isDark]
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, isDark, mode, toggleTheme, setMode }),
    [theme, isDark, mode, toggleTheme, setMode]
  )

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * useTheme — access current theme in any component.
 * @example
 *   const { theme, isDark, toggleTheme } = useTheme()
 *   <View style={{ backgroundColor: theme.colors.background }} />
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
