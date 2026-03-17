import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList, CheckCircle2, Clock, Circle } from 'lucide-react'
import { getPortalForms } from '@/api/portal'

interface Props { projectId: number }

function statusConfig(status: string) {
  if (status === 'Submitted') return { label: 'Submitted', icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, badge: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' }
  if (status === 'InProgress') return { label: 'In Progress', icon: <Clock className="h-4 w-4 text-yellow-600" />, badge: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100' }
  return { label: 'Not Started', icon: <Circle className="h-4 w-4 text-gray-400" />, badge: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100' }
}

export default function PortalFormsTab({ projectId }: Props) {
  const navigate = useNavigate()
  const { data: forms, isLoading } = useQuery({
    queryKey: ['portal-forms', projectId],
    queryFn: () => getPortalForms(projectId),
  })

  if (isLoading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>

  if (!forms?.length) {
    return <div className="py-16 text-center text-muted-foreground">No data submissions required yet.</div>
  }

  return (
    <div className="space-y-3">
      {forms.map(form => {
        const cfg = statusConfig(form.status)
        return (
          <div key={form.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
            <div className="flex items-center gap-3 min-w-0">
              <ClipboardList className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">{form.formName}</p>
                {form.assignedToName && (
                  <p className="text-sm text-muted-foreground">Assigned to {form.assignedToName}</p>
                )}
                {form.notes && <p className="text-sm text-muted-foreground mt-0.5">{form.notes}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <div className="flex items-center gap-1.5">
                {cfg.icon}
                <Badge className={`text-xs ${cfg.badge}`}>{cfg.label}</Badge>
              </div>
              {form.status !== 'Submitted' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/portal/${projectId}/forms/${form.id}`)}
                >
                  {form.status === 'InProgress' ? 'Continue' : 'Start'}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
