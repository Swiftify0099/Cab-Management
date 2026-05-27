import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

export function AuthGuard() {
  const is_authenticated = useAuthStore((s) => s.is_authenticated)

  if (!is_authenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
