/**
 * Admin auth Zustand store — manages login state, tokens, and user info.
 */
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface AdminUser {
  id: string
  email: string
  role: string
  must_change_password: boolean
}

interface AuthState {
  user: AdminUser | null
  access_token: string | null
  refresh_token: string | null
  is_authenticated: boolean

  // Actions
  login: (user: AdminUser, access_token: string, refresh_token: string) => void
  logout: () => void
  setTokens: (access_token: string, refresh_token: string) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      is_authenticated: false,

      login: (user, access_token, refresh_token) =>
        set({ user, access_token, refresh_token, is_authenticated: true }),

      logout: () =>
        set({ user: null, access_token: null, refresh_token: null, is_authenticated: false }),

      setTokens: (access_token, refresh_token) =>
        set({ access_token, refresh_token }),
    }),
    {
      name: 'cabooking_admin_auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        is_authenticated: state.is_authenticated,
      }),
    }
  )
)
