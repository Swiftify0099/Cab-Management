/**
 * CabBooking Driver App — Production API Client (Real Data, Strict JWT Auth & Role Security)
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

// Request interceptor — attach real JWT Bearer token
api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('access_token')
    if (token && token !== 'demo_token') {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (err) {
    console.warn('[API Request Interceptor Error]', err)
  }
  return config
})

// Response interceptor — token refresh on 401, role-upgrade on 403
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    // ── 401: Try refreshing access token once ───────────────────────────
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = await SecureStore.getItemAsync('refresh_token')
        if (!refresh || refresh === 'demo_token') throw new Error('No valid refresh token')

        const res = await axios.post(`${BASE_URL}/auth/token/refresh`, {
          refresh_token: refresh,
        })
        const tokenData = res.data?.data || res.data
        const { access_token, refresh_token: newRefresh } = tokenData
        if (access_token) {
          await SecureStore.setItemAsync('access_token', access_token)
          if (newRefresh) await SecureStore.setItemAsync('refresh_token', newRefresh)
          await AsyncStorage.setItem('access_token', access_token)

          original.headers.Authorization = `Bearer ${access_token}`
          return api(original)
        }
      } catch (refreshErr) {
        console.warn('[AUTH Refresh Failed, redirecting to login]', refreshErr)
        await SecureStore.deleteItemAsync('access_token')
        await SecureStore.deleteItemAsync('refresh_token')
        await SecureStore.deleteItemAsync('user_data')
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_id', 'user_role'])
        try {
          router.replace('/auth/phone' as any)
        } catch {}
      }
    }

    // ── 403 "Driver access required": upgrade DB role then retry once ───────
    if (error.response?.status === 403 && !original._roleRetry) {
      const token = await SecureStore.getItemAsync('access_token')
      const detail: string = error.response?.data?.detail || ''
      if (
        token &&
        token !== 'demo_token' &&
        (detail.toLowerCase().includes('driver') || detail.toLowerCase().includes('access required'))
      ) {
        original._roleRetry = true
        try {
          await axios.post(
            `${BASE_URL}/driver/claim-driver-role`,
            {},
            { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
          )
          return api(original)
        } catch (upgradeErr) {
          console.warn('[AUTH claim-driver-role failed]', upgradeErr)
        }
      }
    }

    return Promise.reject(error)
  }
)

// ── Auth API ─────────────────────────────────────────────────────────────
export const authApi = {
  sendOtp: (phone: string) => {
    return api.post('/auth/otp/send', { phone: phone.trim(), role: 'driver' })
  },

  verifyOtp: (phone: string, otp_code: string, device_id?: string) => {
    return api.post('/auth/otp/verify', {
      phone: phone.trim(),
      otp_code: otp_code.trim(),
      role: 'driver',
      device_id,
    })
  },

  logout: async (refresh_token?: string) => {
    try {
      if (refresh_token && refresh_token !== 'demo_token') {
        await api.post('/auth/logout', { refresh_token }).catch(() => {})
      }
    } catch {}
    await SecureStore.deleteItemAsync('access_token')
    await SecureStore.deleteItemAsync('refresh_token')
    await SecureStore.deleteItemAsync('user_data')
    await AsyncStorage.clear()
  },
}

// ── Driver Profile, Onboarding & Availability API ─────────────────────────
export const driverApi = {
  getProfile: () => api.get('/driver/me'),
  updateProfile: (data: {
    full_name?: string
    email?: string
    gender?: string
    home_city?: string
    experience_years?: number
    phone?: string
    emergency_contact?: string
  }) => api.patch('/driver/me', data),
  uploadPhoto: (formData: FormData) =>
    api.post('/driver/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deletePhoto: () => api.delete('/driver/me/photo'),
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

// ── Dedicated Driver KYC & Document Lifecycle API ──────────────────────────
export const kycApi = {
  getDashboard: () => api.get('/driver/kyc/dashboard').catch(() => api.get('/driver/verification/status')),
  getDocumentDetails: (docType: string) => api.get(`/driver/kyc/documents/${docType}`),
  getDocumentAccessUrl: (docType: string) => api.get(`/driver/kyc/documents/${docType}/access`),
  uploadDocument: (docType: string, formData: FormData) =>
    api.post(`/driver/kyc/documents/${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).catch(() =>
      api.post(`/driver/me/documents/${docType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ),
  getBankAccount: () => api.get('/driver/kyc/bank-account'),
  submitBankAccount: (data: {
    account_holder_name: string
    bank_name: string
    account_number: string
    confirm_account_number: string
    ifsc_code: string
    account_type?: string
  }) => api.post('/driver/kyc/bank-account', data),
}

// ── Dedicated Multi-Vehicle Management & Lifecycle API ────────────────────
export const vehicleApi = {
  getVehicles: () => api.get('/driver/vehicles').catch(() => api.get('/driver/my-vehicles')),
  getVehicleDetails: (vehicleId: string) => api.get(`/driver/vehicles/${vehicleId}`),
  createVehicle: (data: any) => api.post('/driver/vehicles', data).catch(() => api.post('/driver/me/vehicle', data)),
  updateVehicle: (vehicleId: string, data: any) => api.patch(`/driver/vehicles/${vehicleId}`, data),
  deleteVehicle: (vehicleId: string) => api.delete(`/driver/vehicles/${vehicleId}`),
  activateVehicle: (vehicleId: string) => api.post(`/driver/vehicles/${vehicleId}/activate`),
  getVehicleDocuments: (vehicleId: string) => api.get(`/driver/vehicles/${vehicleId}/documents`),
  uploadVehicleDocument: (vehicleId: string, docType: string, formData: FormData) =>
    api.post(`/driver/vehicles/${vehicleId}/documents/${docType}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

// ── On-Demand Ride Dispatch API ───────────────────────────────────────────
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

// ── Fuel & Expenses API ──────────────────────────────────────────────────
export const fuelApi = {
  getExpenses: (month?: string) =>
    api.get('/driver/expenses/fuel', { params: { month } }),
  addExpense: (data: {
    liters: number
    price_per_liter: number
    total_cost: number
    station_name: string
    odometer_km?: number
    fuel_type?: string
    notes?: string
  }) => api.post('/driver/expenses/fuel', data),
  deleteExpense: (id: string) => api.delete(`/driver/expenses/fuel/${id}`),
}

// ── Tax & Settlement API ─────────────────────────────────────────────────
export const taxApi = {
  getSettlements: () =>
    api.get('/matching/driver/wallet/settlements').catch(() => api.get('/driver/settlements')),
}

// ── Leaderboard API ──────────────────────────────────────────────────────
export const leaderboardApi = {
  getLeaderboard: (period: string = 'month') =>
    api.get('/driver/leaderboard', { params: { period } }).catch(() => api.get('/matching/driver/leaderboard', { params: { period } })),
}

// ── Training & Certification API ─────────────────────────────────────────
export const trainingApi = {
  getModules: () =>
    api.get('/driver/training/modules'),
  completeModule: (moduleId: string, score?: number) =>
    api.post(`/driver/training/modules/${moduleId}/complete`, { score }),
  getCertificates: () =>
    api.get('/driver/training/certificates'),
}

// ── OpenRouter AI Driver Assistant API ────────────────────────────────────
export const aiApi = {
  chat: (prompt: string, context?: any) =>
    api.post('/driver/ai/chat', { prompt, context }).catch(() => api.post('/matching/ai/chat', { prompt, context })),
  getDriverInsights: (lat?: number, lng?: number) =>
    api.get('/matching/ai/driver-insights', { params: { lat, lng } }),
}

// ── Common Job Contract API (Master Core Architecture) ────────────────────
export const commonJobApi = {
  getActiveJob: () =>
    api.get('/driver/jobs/active'),
  getJobById: (jobId: string, jobType?: string) =>
    api.get(`/driver/jobs/${jobId}`, { params: jobType ? { job_type: jobType } : {} }),
  sendCommand: (jobId: string, command: string, params?: any, jobType?: string) =>
    api.post(`/driver/jobs/${jobId}/command${jobType ? `?job_type=${jobType}` : ''}`, {
      command,
      params: params || null,
    }),
  getHistory: (limit: number = 20, jobType?: string) =>
    api.get('/driver/jobs/history/list', {
      params: { limit, ...(jobType ? { job_type: jobType } : {}) },
    }),
}
