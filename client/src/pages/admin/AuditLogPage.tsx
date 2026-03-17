import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { getAuditLog, downloadAuditExport } from '@/api/audit'
import type { AuditLogFilters } from '@/api/audit'
import { formatAuditTimestamp } from '@/lib/formatTimestamp'
import { getProfile } from '@/api/profile'
import type { ProfileDto } from '@/api/profile'

const ROLES = ['Admin', 'CIS', 'SuperCustomer', 'Customer']
const PAGE_SIZE = 50

function actionBadgeVariant(action: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (action.endsWith('.deleted') || action.endsWith('.removed') || action.endsWith('.revoked')) return 'destructive'
  if (action.endsWith('.created') || action.endsWith('.invited') || action.endsWith('.submitted') || action.endsWith('.granted')) return 'default'
  return 'secondary'
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<AuditLogFilters>({})
  const [inputValues, setInputValues] = useState({
    from: '', to: '', userSearch: '', role: '', action: '', entityType: '', projectId: '',
  })

  const { data: profile } = useQuery<ProfileDto>({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  const activeFilters: AuditLogFilters = {
    ...filters,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', activeFilters],
    queryFn: () => getAuditLog(activeFilters),
  })

  const applyFilters = useCallback(() => {
    setFilters({
      from: inputValues.from || undefined,
      to: inputValues.to || undefined,
      userSearch: inputValues.userSearch || undefined,
      role: inputValues.role || undefined,
      action: inputValues.action || undefined,
      entityType: inputValues.entityType || undefined,
      projectId: inputValues.projectId ? Number(inputValues.projectId) : undefined,
    })
    setPage(1)
  }, [inputValues])

  const clearFilters = () => {
    setInputValues({ from: '', to: '', userSearch: '', role: '', action: '', entityType: '', projectId: '' })
    setFilters({})
    setPage(1)
  }

  const handleExport = async () => {
    try {
      await downloadAuditExport(filters)
    } catch {
      toast.error('Export failed')
    }
  }

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 1

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Complete history of all user activity</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-md border p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={inputValues.from} onChange={e => setInputValues(v => ({ ...v, from: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={inputValues.to} onChange={e => setInputValues(v => ({ ...v, to: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">User</Label>
            <Input placeholder="Search by name..." value={inputValues.userSearch} onChange={e => setInputValues(v => ({ ...v, userSearch: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <Select value={inputValues.role} onValueChange={v => setInputValues(iv => ({ ...iv, role: v }))}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Any role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any role</SelectItem>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Action prefix</Label>
            <Input placeholder="e.g. project" value={inputValues.action} onChange={e => setInputValues(v => ({ ...v, action: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Entity Type</Label>
            <Input placeholder="e.g. Project" value={inputValues.entityType} onChange={e => setInputValues(v => ({ ...v, entityType: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Project ID</Label>
            <Input type="number" placeholder="Filter by project" value={inputValues.projectId} onChange={e => setInputValues(v => ({ ...v, projectId: e.target.value }))} className="h-8 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <Button size="sm" onClick={applyFilters} className="h-8">Apply</Button>
            <Button size="sm" variant="ghost" onClick={clearFilters} className="h-8">Clear</Button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-md border overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="p-3 border-b last:border-b-0 flex items-center gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No audit log entries match the current filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Timestamp</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">User</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Action</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Entity</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Project</th>
                  <th className="text-left p-3 font-medium text-xs text-muted-foreground">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map(entry => (
                  <tr key={entry.id} className="border-b last:border-b-0 hover:bg-muted/30">
                    <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatAuditTimestamp(entry.timestamp, profile?.timeZoneId)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{entry.userFullName}</div>
                      <Badge variant="outline" className="text-xs mt-0.5">{entry.userRole}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={actionBadgeVariant(entry.action)} className="text-xs">{entry.action}</Badge>
                    </td>
                    <td className="p-3 text-xs">
                      <div>{entry.entityType}</div>
                      {entry.entityName && <div className="text-muted-foreground truncate max-w-[160px]">{entry.entityName}</div>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {entry.projectName && (
                        <div className="truncate max-w-[140px]">{entry.projectName}</div>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">{entry.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalCount > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.totalCount.toLocaleString()} total entries</span>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">Page {page} of {totalPages}</span>
            <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
