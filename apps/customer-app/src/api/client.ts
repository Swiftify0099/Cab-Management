/**
 * CabBooking Customer App — API client with Axios + token refresh.
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:80/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch {}
  return config
})

// Response interceptor — token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token')
        if (!refresh) throw new Error('No refresh token')

        const res = await axios.post(`${BASE_URL}/auth/token/refresh`, {
          refresh_token: refresh,
        })
        const { access_token, refresh_token: newRefresh } = res.data.data
        await SecureStore.setItemAsync('access_token', access_token)
        await SecureStore.setItemAsync('refresh_token', newRefresh)

        original.headers.Authorization = `Bearer ${access_token}`
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('refresh_token')
        // TODO: navigate to login
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
    api.post('/auth/otp/verify', { phone, otp_code, role: 'customer', device_id }),

  logout: (refresh_token: string, access_token_jti?: string) =>
    api.post('/auth/logout', { refresh_token, access_token_jti }),
}

// Profile API
export const profileApi = {
  setup: (data: {
    full_name: string
    gender: string
    dob: string
    emergency_contact: string
  }) => api.post('/profile/setup', data),

  getMe: () => api.get('/profile/me'),
  updateMe: (data: object) => api.patch('/profile/me', data),
  uploadPhoto: (formData: FormData) =>
    api.post('/profile/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAddresses: () => api.get('/profile/me/addresses'),
  addAddress: (data: object) => api.post('/profile/me/addresses', data),
  deleteAddress: (id: string) => api.delete(`/profile/me/addresses/${id}`),
}
