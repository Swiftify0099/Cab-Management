/**
 * Customer Web Auth Store — Zustand + localStorage persistence
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  userId: string
  phone: string
  role: string
  profileComplete: boolean
  isNewUser: boolean
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  isAuthenticated: boolean

  login: (user: AuthUser, accessToken: string, refreshToken: string) => void
  logout: () => void
  setProfileComplete: () => void
  setToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,

      login: (user, accessToken, refreshToken) => {
        localStorage.setItem('refresh_token', refreshToken)
        set({ user, accessToken, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('refresh_token')
        set({ user: null, accessToken: null, isAuthenticated: false })
      },

      setProfileComplete: () => {
        const user = get().user
        if (user) set({ user: { ...user, profileComplete: true } })
      },

      setToken: (token) => set({ accessToken: token }),
    }),
    {
      name: 'cabooking-auth',
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken, isAuthenticated: s.isAuthenticated }),
    }
  )
)
