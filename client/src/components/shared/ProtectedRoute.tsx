import { Navigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  roles?: UserRole[]
}

function homeFor(role: UserRole): string {
  if (role === 'Admin' || role === 'CIS') return '/admin'
  if (role === 'SuperCustomer' || role === 'Customer') return '/portal'
  return '/portal'
}

export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { token, user } = useAuthStore()

  if (!token || !user) return <Navigate to="/login" replace />

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homeFor(user.role)} replace />
  }

  return <>{children}</>
}
