import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { LandingPage } from './pages/Landing/LandingPage'
import { LoginPage } from './pages/Auth/LoginPage'
import { OTPPage } from './pages/Auth/OTPPage'
import { ProfileSetupPage } from './pages/Auth/ProfileSetupPage'
import { BookCabPage } from './pages/Booking/BookCabPage'
import { WaitingScreen } from './pages/Booking/WaitingScreen'
import { TripsPage } from './pages/Trips/TripsPage'
import { WalletPage } from './pages/Wallet/WalletPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { LiveTrackPage } from './pages/Tracking/LiveTrackPage'
import { HotelsPage } from './pages/Hotels/HotelsPage'
import { ParcelsPage } from './pages/Parcels/ParcelsPage'
import { PaymentPage } from './pages/Payment/PaymentPage'
import { AuthGuard } from './components/auth/AuthGuard'
import { Navbar } from './components/layout/Navbar'
import { useAuthStore } from './store/auth.store'

const qc = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function AppRoutes() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/book" /> : <LoginPage />} />
      <Route path="/login/otp" element={<OTPPage />} />
      <Route path="/setup-profile" element={<AuthGuard><ProfileSetupPage /></AuthGuard>} />

      {/* Protected — with Navbar */}
      <Route path="/book" element={<AuthGuard><Navbar /><BookCabPage /></AuthGuard>} />
      <Route path="/trips" element={<AuthGuard><Navbar /><TripsPage /></AuthGuard>} />
      <Route path="/wallet" element={<AuthGuard><Navbar /><WalletPage /></AuthGuard>} />
      <Route path="/profile" element={<AuthGuard><Navbar /><ProfilePage /></AuthGuard>} />
      <Route path="/hotels" element={<AuthGuard><Navbar /><HotelsPage /></AuthGuard>} />
      <Route path="/parcels" element={<AuthGuard><Navbar /><ParcelsPage /></AuthGuard>} />

      {/* Phase 4 — Matching */}
      <Route path="/booking/:bookingId/waiting" element={<AuthGuard><WaitingScreen /></AuthGuard>} />

      {/* Phase 5 — Live Tracking (fullscreen, no Navbar) */}
      <Route path="/trips/:bookingId/track" element={<AuthGuard><LiveTrackPage /></AuthGuard>} />

      {/* Phase 6 — Payment */}
      <Route path="/booking/:bookingId/pay" element={<AuthGuard><Navbar /><PaymentPage /></AuthGuard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
