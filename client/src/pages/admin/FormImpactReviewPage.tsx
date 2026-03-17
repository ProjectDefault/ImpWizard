import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getFormChangeImpacts, markImpactReviewed } from '@/api/importTemplates'
import type { FormChangeImpactDto } from '@/api/importTemplates'

function parseIssues(json: string | null): string[] {
  if (!json) return []
  try { return JSON.parse(json) } catch { return [] }
}

function ImpactCard({ impact, onReview }: { impact: FormChangeImpactDto; onReview: () => void }) {
  const issues = parseIssues(impact.validationIssuesJson)

  return (
    <div className="rounded-md border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{impact.projectName}</span>
            <Badge variant="outline" className="text-xs px-1.5 py-0">{impact.changeType}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Queued {new Date(impact.queuedAt).toLocaleString()}
          </p>
        </div>
        <Button size="sm" onClick={onReview}>
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Mark Reviewed
        </Button>
      </div>

      {issues.length > 0 ? (
        <ul className="space-y-1">
          {issues.map((issue, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span>{issue}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No validation issues detected.</p>
      )}
    </div>
  )
}

export default function FormImpactReviewPage() {
  const qc = useQueryClient()

  const { data: impacts = [], isLoading } = useQuery({
    queryKey: ['form-change-impacts'],
    queryFn: getFormChangeImpacts,
  })

  const reviewMutation = useMutation({
    mutationFn: markImpactReviewed,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['form-change-impacts'] })
      toast.success('Marked as reviewed')
    },
    onError: () => toast.error('Failed to mark as reviewed'),
  })

  // Group by formId
  const grouped = impacts.reduce<Record<number, { formId: number; changeType: string; items: FormChangeImpactDto[] }>>(
    (acc, impact) => {
      const key = impact.formChangeQueueId
      if (!acc[key]) acc[key] = { formId: impact.formId, changeType: impact.changeType, items: [] }
      acc[key].items.push(impact)
      return acc
    },
    {}
  )

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold">Form Change Review</h1>
          <p className="text-sm text-muted-foreground">
            Pending validation issues from form changes — processed nightly at 3 AM EST
          </p>
        </div>
        <div className="shrink-0">
          {impacts.length > 0 && (
            <Badge className="bg-amber-500 hover:bg-amber-500">
              {impacts.length} pending
            </Badge>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-md border p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
              <Skeleton className="h-3 w-60" />
            </div>
          ))}
        </div>
      ) : impacts.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500/60" />
          <p className="text-sm font-medium text-muted-foreground">All clear — no pending reviews</p>
          <p className="text-xs text-muted-foreground mt-1">
            Items appear here after the 3 AM nightly job processes form changes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.values(grouped).map(group => (
            <div key={group.formId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Form ID {group.formId}</span>
                <Badge variant="secondary" className="text-xs">{group.changeType}</Badge>
                <span className="text-xs text-muted-foreground">
                  — {group.items.length} project{group.items.length !== 1 ? 's' : ''} affected
                </span>
              </div>
              <div className="space-y-2 pl-6">
                {group.items.map(impact => (
                  <ImpactCard
                    key={impact.id}
                    impact={impact}
                    onReview={() => reviewMutation.mutate(impact.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
