import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, Clock, FileSpreadsheet, ThumbsUp } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

const steps = [
  { number: 1, label: 'Business Profile' },
  { number: 2, label: 'Preferences' },
  { number: 3, label: 'Catalog Search' },
  { number: 4, label: 'Flexible Import' },
  { number: 5, label: 'Staging & Review' },
  { number: 6, label: 'Validation' },
  { number: 7, label: 'Export' },
]

export default function SuperCustomerDashboard() {
  const { user } = useAuthStore()

  // These will come from API once the project-user link is built
  const currentStep = 3
  const status = 'Active'
  const projectName = 'Your Implementation Project'

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h1 className="text-2xl font-semibold mt-1">{user?.name}</h1>
      </div>

      {/* Project card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{projectName}</CardTitle>
            <Badge variant="secondary">{status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Step {currentStep} of 7</span>
              <span>{Math.round((currentStep / 7) * 100)}% complete</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${(currentStep / 7) * 100}%` }}
              />
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-1.5">
            {steps.map(step => {
              const done = step.number < currentStep
              const active = step.number === currentStep
              return (
                <div key={step.number} className="flex items-center gap-3 text-sm">
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : active ? (
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                  )}
                  <span className={done ? 'text-muted-foreground line-through' : active ? 'font-medium' : 'text-muted-foreground'}>
                    {step.label}
                  </span>
                  {active && <Badge variant="secondary" className="text-xs ml-auto">In Progress</Badge>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:bg-muted/30 transition-colors">
          <CardContent className="flex items-center gap-4 pt-5">
            <FileSpreadsheet className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">View Your Items</p>
              <p className="text-xs text-muted-foreground mt-0.5">Review the items staged for your implementation</p>
            </div>
          </CardContent>
        </Card>

        <Card className={currentStep < 7 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/30 transition-colors'}>
          <CardContent className="flex items-center gap-4 pt-5">
            <ThumbsUp className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="font-medium text-sm">Approve & Submit</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {currentStep < 7 ? 'Available once all steps are complete' : 'Give final approval for your implementation'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {currentStep < 7 && (
        <p className="text-xs text-center text-muted-foreground">
          Your implementation specialist is currently working through the steps.
          You will be notified when your approval is needed.
        </p>
      )}
    </div>
  )
}
