import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { cn } from '@/lib/utils'

const steps = [
  { number: 1, label: 'Business Profile', path: '/wizard/step/1' },
  { number: 2, label: 'Preferences', path: '/wizard/step/2' },
  { number: 3, label: 'Catalog Search', path: '/wizard/step/3' },
  { number: 4, label: 'Flexible Import', path: '/wizard/step/4' },
  { number: 5, label: 'Staging & Review', path: '/wizard/step/5' },
  { number: 6, label: 'Validation', path: '/wizard/step/6' },
  { number: 7, label: 'Export', path: '/wizard/step/7' },
]

function getCurrentStep(pathname: string): number {
  const match = pathname.match(/\/wizard\/step\/(\d+)/)
  return match ? parseInt(match[1]) : 1
}

export default function WizardLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const currentStep = getCurrentStep(location.pathname)

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Step sidebar */}
      <aside className="w-64 border-r bg-muted/30 flex flex-col shrink-0">
        {/* Brand */}
        <div className="px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              I
            </div>
            <span className="font-semibold text-sm">Imp Wizard</span>
          </div>
          {user && (
            <p className="text-xs text-muted-foreground mt-2 truncate">{user.name}</p>
          )}
        </div>

        {/* Steps */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {steps.map(step => {
            const isDone = step.number < currentStep
            const isCurrent = step.number === currentStep
            const isLocked = step.number > currentStep

            return (
              <div
                key={step.number}
                className={cn(
                  'flex items-center gap-3 px-2 py-2.5 rounded-md text-sm',
                  isCurrent && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium',
                  isDone && 'text-muted-foreground',
                  isLocked && 'text-muted-foreground/50 cursor-not-allowed'
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0" />
                )}
                <span className="leading-tight">
                  <span className="text-xs text-muted-foreground block">Step {step.number}</span>
                  {step.label}
                </span>
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Step content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>

        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto px-6 py-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}
