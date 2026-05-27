import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/auth.store'

interface Props { children: React.ReactNode }

export function AuthGuard({ children }: Props) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (isAuthenticated && !user?.profileComplete) return <Navigate to="/setup-profile" replace />

  return <>{children}</>
}
