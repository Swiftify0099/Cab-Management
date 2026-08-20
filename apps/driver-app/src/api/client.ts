/**
 * CabBooking Driver App — Shared API client with Axios + token refresh.
 */
import axios from 'axios'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { router } from 'expo-router'

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://cab-management-1.onrender.com/api/v1'

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

// Driver profile, onboarding & availability API
export const driverApi = {
  getProfile: () => api.get('/driver/me'),
  updateProfile: (data: {
    full_name?: string
    email?: string
    gender?: string
    home_city?: string
    experience_years?: number
  }) => api.patch('/driver/me', data),
  uploadPhoto: (formData: FormData) =>
    api.post('/driver/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  setupProfile: (data: any) => api.post('/driver/setup', data),
  setupVehicle: (data: any) => api.post('/driver/me/vehicle', data),
  uploadDocument: (docType: string, formData: FormData) =>
    api.post(`/driver/me/documents/${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getStatus: () => api.get('/driver/status'),
  updateStatus: (status: 'online' | 'offline') =>
    api.patch('/driver/status', { status }),
  getStats: () => api.get('/driver/stats'),
  getVerificationStatus: () => api.get('/driver/verification/status'),
  getEarnings: () => api.get('/driver/earnings'),
}

// Dedicated Driver KYC & Document Lifecycle API
export const kycApi = {
  getDashboard: () => api.get('/driver/kyc/dashboard'),
  getDocumentDetails: (docType: string) => api.get(`/driver/kyc/documents/${docType}`),
  uploadDocument: (docType: string, formData: FormData) =>
    api.post(`/driver/kyc/documents/${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getBankAccount: () => api.get('/driver/kyc/bank-account'),
  submitBankAccount: (data: {
    account_holder_name: string
    bank_name: string
    account_number: string
    confirm_account_number: string
    ifsc_code: string
    account_type?: string
  }) => api.post('/driver/kyc/bank-account', data),
  devSetStatus: (docType: string, target_status: string, rejection_reason?: string) => {
    const fd = new FormData()
    fd.append('target_status', target_status)
    if (rejection_reason) fd.append('rejection_reason', rejection_reason)
    return api.post(`/driver/kyc/dev/set-status/${docType}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// Dedicated Multi-Vehicle Management & Lifecycle API
export const vehicleApi = {
  getVehicles: () => api.get('/driver/vehicles'),
  getVehicleDetails: (vehicleId: string) => api.get(`/driver/vehicles/${vehicleId}`),
  createVehicle: (data: any) => api.post('/driver/vehicles', data),
  updateVehicle: (vehicleId: string, data: any) => api.patch(`/driver/vehicles/${vehicleId}`, data),
  deleteVehicle: (vehicleId: string) => api.delete(`/driver/vehicles/${vehicleId}`),
  activateVehicle: (vehicleId: string) => api.post(`/driver/vehicles/${vehicleId}/activate`),
  getVehicleDocuments: (vehicleId: string) => api.get(`/driver/vehicles/${vehicleId}/documents`),
  uploadVehicleDocument: (vehicleId: string, docType: string, formData: FormData) =>
    api.post(`/driver/vehicles/${vehicleId}/documents/${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  scheduleInspection: (vehicleId: string, data: any) =>
    api.post(`/driver/vehicles/${vehicleId}/inspection/schedule`, data),
  getInspectionDetails: (vehicleId: string) => api.get(`/driver/vehicles/${vehicleId}/inspection`),
  submitForReview: (vehicleId: string) => api.post(`/driver/vehicles/${vehicleId}/submit-review`),
  devSetStatus: (vehicleId: string, target_status: string, rejection_reason?: string) => {
    const fd = new FormData()
    fd.append('target_status', target_status)
    if (rejection_reason) fd.append('rejection_reason', rejection_reason)
    return api.post(`/driver/vehicles/dev/set-status/${vehicleId}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  devSetInspection: (vehicleId: string, status: string, score?: number) => {
    return api.post(`/driver/vehicles/dev/set-inspection/${vehicleId}`, { status, score })
  },
}

// On-Demand Ride Dispatch API (Feature 5)
export const rideApi = {
  respondToOffer: (offerId: string, accepted: boolean, rejectionReason?: string) =>
    api.post('/matching/rides/respond', {
      offer_id: offerId,
      accepted,
      rejection_reason: rejectionReason,
    }),
  getActiveRide: () => api.get('/matching/rides/active'),
  getCategories: () => api.get('/matching/rides/categories'),
  cancelRide: (rideRequestId: string, reason?: string) =>
    api.post('/matching/rides/cancel', { ride_request_id: rideRequestId, reason }),
}


