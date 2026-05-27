import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts/AdminLayout'
import { AuthGuard } from './components/auth/AuthGuard'
import { LoginPage } from './pages/Login/LoginPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { DriversPage } from './pages/Drivers/DriversPage'
import { CustomersPage } from './pages/Customers/CustomersPage'
import { AdminTripsPage } from './pages/Trips/AdminTripsPage'
import { AdminParcelsPage } from './pages/Parcels/AdminParcelsPage'
import { HotelsPage } from './pages/Hotels/HotelsPage'
import { FinancePage } from './pages/Finance/FinancePage'
import { CouponsPage } from './pages/Coupons/CouponsPage'
import { ThemesPage } from './pages/Themes/ThemesPage'
import { KYCPage } from './pages/KYC/KYCPage'
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { NotFoundPage } from './pages/NotFound/NotFoundPage'
import { FleetMapPage } from './pages/Fleet/FleetMapPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected admin routes */}
          <Route element={<AuthGuard />}>
            <Route element={<AdminLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/drivers" element={<DriversPage />} />
              <Route path="/customers" element={<CustomersPage />} />
              <Route path="/trips" element={<AdminTripsPage />} />
              <Route path="/fleet" element={<FleetMapPage />} />
              <Route path="/parcels" element={<AdminParcelsPage />} />
              <Route path="/hotels" element={<HotelsPage />} />
              <Route path="/finance" element={<FinancePage />} />
              <Route path="/coupons" element={<CouponsPage />} />
              <Route path="/themes" element={<ThemesPage />} />
              <Route path="/kyc" element={<KYCPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: '12px',
              background: '#1E293B',
              color: '#F1F5F9',
              border: '1px solid #334155',
              fontSize: '14px',
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
