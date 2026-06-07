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

// Response interceptor — token refresh on 401, then force re-login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
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
        // Navigate to login — works because router is available after app mounts
        try { router.replace('/auth/phone' as any) } catch {}
      }
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  sendOtp: (phone: string) =>
    api.post('/auth/otp/send', { phone }),

  verifyOtp: (phone: string, otp_code: string, device_id?: string) =>
    api.post('/auth/otp/verify', { phone, otp_code, role: 'driver', device_id }),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),
}

// Driver onboarding API
export const driverApi = {
  getProfile: () => api.get('/driver/profile'),
  submitKyc: (formData: FormData) =>
    api.post('/driver/kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStatus: () => api.get('/driver/status'),
}
