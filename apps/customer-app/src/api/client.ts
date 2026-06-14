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

  // Google Sign-In: sends id_token to backend for Firebase verification
  googleSignIn: (id_token: string) =>
    api.post('/auth/google/verify', { id_token, role: 'customer' }),
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
  addAddress: (data: {
    label: string
    address: string
    address_type?: string
    latitude?: number
    longitude?: number
    is_default?: boolean
  }) => api.post('/profile/me/addresses', {
    label: data.label,
    address_type: data.address_type || 'general',
    full_address: data.address,
    latitude: data.latitude || 0,
    longitude: data.longitude || 0,
    is_default: data.is_default || false,
  }),
  updateAddress: (id: string, data: {
    label?: string
    address?: string
    address_type?: string
    latitude?: number
    longitude?: number
  }) =>
    api.patch(`/profile/me/addresses/${id}`, {
      label: data.label,
      address_type: data.address_type,
      full_address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
    }),
  deleteAddress: (id: string) => api.delete(`/profile/me/addresses/${id}`),
}

// Route API (saved pickup+drop pairs)
export const routeApi = {
  getRoutes: () => api.get('/profile/me/routes'),
  addRoute: (data: {
    route_name: string
    pickup_label: string
    pickup_address: string
    pickup_lat: number
    pickup_lon: number
    drop_label: string
    drop_address: string
    drop_lat: number
    drop_lon: number
  }) => api.post('/profile/me/routes', data),
  deleteRoute: (id: string) => api.delete(`/profile/me/routes/${id}`),
}

// Wallet API
export const walletApi = {
  getBalance: () => api.get('/wallet'),
  getTransactions: (params?: { type?: string; page?: number; limit?: number }) =>
    api.get('/wallet/transactions', { params }),
  getRefunds: () => api.get('/wallet/refunds'),
  topUp: (data: { amount: number }) => api.post('/wallet/topup', data),
  walletPay: (data: { booking_id: string; amount: number }) =>
    api.post('/payments/wallet-pay', data),
}

// Parcel API
export const parcelApi = {
  getMyParcels: () => api.get('/parcels/my'),
  getParcel: (id: string) => api.get(`/parcels/${id}`),
  createBooking: (data: {
    trip_id: string
    sender_name: string
    sender_phone: string
    receiver_name: string
    receiver_phone: string
    receiver_address: string
    weight_kg: number
    description: string
    fragile: boolean
    urgent: boolean
    declared_value?: number
  }) => api.post('/parcels', data),
  uploadPhoto: (id: string, formData: FormData) =>
    api.post(`/parcels/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// Booking API
export const bookingApi = {
  getMyTrips: () => api.get('/bookings/my-trips'),
  getBooking: (id: string) => api.get(`/bookings/${id}`),
  cancelBooking: (id: string, reason: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }),
  createPendingBooking: (data: object) => api.post('/bookings/pending', data),
  deletePendingBooking: (id: string) => api.delete(`/bookings/pending/${id}`),
}
