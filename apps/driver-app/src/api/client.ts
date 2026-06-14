/**
 * CabBooking Driver App — Shared API client with Axios + token refresh.
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8001/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT (skip invalid demo tokens)
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    // Skip demo_token — it is not a valid JWT and will always cause 401
    if (token && token !== 'demo_token') {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

// Response interceptor — token refresh on 401, role-upgrade on 403, graceful 404
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // ── 401: Try refreshing the access token once ──────────────────────────
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token')
        if (!refresh || refresh === 'demo_token') throw new Error('No valid refresh token')

        const res = await axios.post(`${BASE_URL}/auth/token/refresh`, {
          refresh_token: refresh,
        })
        const { access_token, refresh_token: newRefresh } = res.data.data
        await SecureStore.setItemAsync('access_token', access_token)
        await SecureStore.setItemAsync('refresh_token', newRefresh)
        await AsyncStorage.setItem('access_token', access_token)

        original.headers.Authorization = `Bearer ${access_token}`
        return api(original)
      } catch {
        // Clear all stored tokens and send to login
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('refresh_token')
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_id', 'user_role'])
        try { router.replace('/auth/phone' as any) } catch {}
      }
    }

    // ── 403 "Driver access required": upgrade DB role then retry once ───────
    // This heals accounts whose DB role is still 'customer' (pre-fix registrations).
    if (error.response?.status === 403 && !original._roleRetry) {
      const detail: string = error.response?.data?.detail || ''
      if (
        detail.toLowerCase().includes('driver') ||
        detail.toLowerCase().includes('access required')
      ) {
        original._roleRetry = true
        try {
          const token = await SecureStore.getItemAsync('access_token')
          // Call claim-driver-role using a raw axios call so it doesn't loop
          await axios.post(
            `${BASE_URL}/driver/claim-driver-role`,
            {},
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
          )
          // Retry the original request — DB role is now driver
          return api(original)
        } catch (upgradeErr) {
          // Role upgrade failed — clear tokens and force re-login
          console.warn('[AUTH] claim-driver-role failed, forcing re-login', upgradeErr)
          await SecureStore.deleteItemAsync('access_token')
          await SecureStore.deleteItemAsync('refresh_token')
          await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_id', 'user_role'])
          try { router.replace('/auth/phone' as any) } catch {}
        }
      }
    }

    // ── 404: Gracefully resolve so Expo Router doesn't crash ────────────────
    if (error.response?.status === 404) {
      console.warn(`[API] 404 Not Found gracefully caught for: ${original?.url}`)
      return Promise.resolve({ data: { success: false, message: 'Not found', data: null } })
    }

    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/otp/send', { phone, role: 'driver' }),

  verifyOtp: (phone: string, otp_code: string, device_id?: string) =>
    api.post('/auth/otp/verify', { phone, otp_code, role: 'driver', device_id }),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),
}

// Driver onboarding API
export const driverApi = {
  getProfile: () => api.get('/driver/me'),
  setupProfile: (data: any) => api.post('/driver/setup', data),
  setupVehicle: (data: any) => api.post('/driver/me/vehicle', data),
  uploadDocument: (docType: string, formData: FormData) =>
    api.post(`/driver/me/documents/${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStatus: () => api.get('/driver/status'),
}
