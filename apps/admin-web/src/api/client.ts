import axios from 'axios'
import { useAuthStore } from '../store/auth.store'

const BASE_URL = import.meta.env.VITE_API_URL || 'https://cab-management-1.onrender.com/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor — attach JWT
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor — handle 401 + token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        const refreshToken = useAuthStore.getState().refresh_token
        const res = await axios.post(`${BASE_URL}/auth/token/refresh`, {
          refresh_token: refreshToken,
        })

        const { access_token, refresh_token: new_refresh } = res.data.data
        useAuthStore.getState().setTokens(access_token, new_refresh)

        original.headers.Authorization = `Bearer ${access_token}`
        return apiClient(original)
      } catch {
        useAuthStore.getState().logout()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Alias for consistency across admin pages
export const adminApi = apiClient
