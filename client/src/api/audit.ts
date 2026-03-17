import api from './client'

export interface AuditLogEntryDto {
  id: number
  timestamp: string
  userId: string
  userFullName: string
  userRole: string
  action: string
  entityType: string
  entityId: string | null
  entityName: string | null
  projectId: number | null
  projectName: string | null
  detail: string | null
}

export interface AuditLogFilters {
  from?: string
  to?: string
  userId?: string
  userSearch?: string
  role?: string
  action?: string
  entityType?: string
  projectId?: number
  page?: number
  pageSize?: number
}

export interface AuditLogPagedResult {
  items: AuditLogEntryDto[]
  totalCount: number
  page: number
  pageSize: number
}

export async function getAuditLog(filters: AuditLogFilters = {}): Promise<AuditLogPagedResult> {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.userSearch) params.set('userSearch', filters.userSearch)
  if (filters.role) params.set('role', filters.role)
  if (filters.action) params.set('action', filters.action)
  if (filters.entityType) params.set('entityType', filters.entityType)
  if (filters.projectId !== undefined) params.set('projectId', String(filters.projectId))
  if (filters.page !== undefined) params.set('page', String(filters.page))
  if (filters.pageSize !== undefined) params.set('pageSize', String(filters.pageSize))
  const res = await api.get<AuditLogPagedResult>(`/audit?${params}`)
  return res.data
}

export async function downloadAuditExport(filters: AuditLogFilters = {}): Promise<void> {
  const params = new URLSearchParams()
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  if (filters.userId) params.set('userId', filters.userId)
  if (filters.userSearch) params.set('userSearch', filters.userSearch)
  if (filters.role) params.set('role', filters.role)
  if (filters.action) params.set('action', filters.action)
  if (filters.entityType) params.set('entityType', filters.entityType)
  if (filters.projectId !== undefined) params.set('projectId', String(filters.projectId))
  const res = await api.get(`/audit/export?${params}`, { responseType: 'blob' })
  const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'audit-log.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export async function getProjectChangelog(projectId: number): Promise<AuditLogEntryDto[]> {
  const res = await api.get<AuditLogEntryDto[]>(`/audit/project/${projectId}`)
  return res.data
}

export async function getPortalProjectHistory(projectId: number): Promise<AuditLogEntryDto[]> {
  const res = await api.get<AuditLogEntryDto[]>(`/portal/projects/${projectId}/history`)
  return res.data
}
