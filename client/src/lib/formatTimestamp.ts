export function formatAuditTimestamp(isoUtc: string, tzId?: string | null): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tzId ?? 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(new Date(isoUtc))
  } catch {
    return new Date(isoUtc).toUTCString()
  }
}
