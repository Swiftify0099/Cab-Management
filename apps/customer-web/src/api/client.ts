/**
 * Customer Web API Client — Axios with JWT refresh interceptor
 */
import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:80/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        if (!refresh) throw new Error('no refresh')
        const res = await axios.post(`${BASE_URL}/auth/token/refresh`, { refresh_token: refresh })
        const { access_token, refresh_token: newRefresh } = res.data.data
        localStorage.setItem('refresh_token', newRefresh)
        useAuthStore.getState().setToken(access_token)
        original.headers.Authorization = `Bearer ${access_token}`
        return api(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  sendOtp: (phone: string) => api.post('/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp_code: string) =>
    api.post('/auth/otp/verify', { phone, otp_code, role: 'customer' }),
  logout: () => api.post('/auth/logout', { refresh_token: localStorage.getItem('refresh_token') }),
}

export const profileApi = {
  setup: (data: object) => api.post('/profile/setup', data),
  getMe: () => api.get('/profile/me'),
  updateMe: (data: object) => api.patch('/profile/me', data),
  getAddresses: () => api.get('/profile/me/addresses'),
  addAddress: (data: object) => api.post('/profile/me/addresses', data),
  deleteAddress: (id: string) => api.delete(`/profile/me/addresses/${id}`),
}

export const bookingApi = {
  // Fare estimation (no trip required)
  getFare: (data: object) => api.post('/bookings/fare', data),

  // Trip search — find available driver trips for a route
  searchTrips: (data: object) => api.post('/trips/search', data),

  // Seat booking on a Trip
  create: (data: object) => api.post('/bookings/', data),
  getMyTrips: (params?: object) => api.get('/bookings/my-trips', { params }),
  getTrip: (id: string) => api.get(`/bookings/${id}`),
  cancelTrip: (id: string, reason: string) => api.post(`/bookings/${id}/cancel`, { reason }),
}

