/**
 * Auth store — manages JWT tokens and auth state in secure storage.
 */
import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'

interface AuthUser {
  userId: string
  role: string
  phone: string
  isNewUser: boolean
  profileComplete: boolean
  full_name?: string
  email?: string
  avatar_url?: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  login: (user: AuthUser, accessToken: string, refreshToken: string) => Promise<void>
  logout: () => Promise<void>
  setProfileComplete: () => void
  setUser: (user: AuthUser | null | any) => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token')
      const userJson = await SecureStore.getItemAsync('auth_user')
      if (token && userJson) {
        const user = JSON.parse(userJson)
        set({ user, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  login: async (user, accessToken, refreshToken) => {
    await SecureStore.setItemAsync('access_token', accessToken)
    await SecureStore.setItemAsync('refresh_token', refreshToken)
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user))
    set({ user, isAuthenticated: true })
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('auth_user')
    set({ user: null, isAuthenticated: false })
  },

  setUser: (userOrFn: any) => {
    const current = get().user
    const nextUser = typeof userOrFn === 'function' ? userOrFn(current) : userOrFn
    set({ user: nextUser })
    if (nextUser) {
      SecureStore.setItemAsync('auth_user', JSON.stringify(nextUser)).catch(() => {})
    }
  },

  setProfileComplete: () => {
    const user = get().user
    if (user) {
      const updated = { ...user, profileComplete: true }
      set({ user: updated })
      SecureStore.setItemAsync('auth_user', JSON.stringify(updated))
    }
  },
}))
