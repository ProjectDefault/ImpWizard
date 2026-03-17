import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getPortalProjectHistory } from '@/api/audit'
import type { AuditLogEntryDto } from '@/api/audit'
import { formatAuditTimestamp } from '@/lib/formatTimestamp'
import { getProfile } from '@/api/profile'

interface Props { projectId: number }

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    'form.submitted': 'Submitted form',
    'team.invited': 'Invited team member',
    'team.removed': 'Removed team member',
    'profile.updated': 'Updated profile',
    'profile.email_changed': 'Changed email',
    'profile.password_changed': 'Changed password',
  }
  return labels[action] ?? action.replace(/\./g, ' ').replace(/_/g, ' ')
}

function actionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.endsWith('.removed') || action.endsWith('.deleted')) return 'destructive'
  if (action.endsWith('.submitted') || action.endsWith('.invited') || action.endsWith('.created')) return 'default'
  return 'secondary'
}

function HistoryRow({ entry, tzId }: { entry: AuditLogEntryDto; tzId?: string | null }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{entry.userFullName}</span>
          <Badge variant="outline" className="text-xs">{entry.userRole}</Badge>
          <Badge variant={actionBadgeVariant(entry.action)} className="text-xs">{actionLabel(entry.action)}</Badge>
        </div>
        {(entry.entityName || entry.detail) && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {entry.entityName && <span className="font-medium">{entry.entityName}</span>}
            {entry.entityName && entry.detail && ' — '}
            {entry.detail}
          </p>
        )}
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
        {formatAuditTimestamp(entry.timestamp, tzId)}
      </span>
    </div>
  )
}

export default function PortalHistoryTab({ projectId }: Props) {
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const { data: history, isLoading } = useQuery({
    queryKey: ['portal-history', projectId],
    queryFn: () => getPortalProjectHistory(projectId),
  })

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No history yet.</div>
  }

  return (
    <div className="divide-y">
      {history.map(entry => (
        <HistoryRow key={entry.id} entry={entry} tzId={profile?.timeZoneId} />
      ))}
    </div>
  )
}
