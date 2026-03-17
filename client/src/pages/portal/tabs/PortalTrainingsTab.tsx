import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar, Clock, ExternalLink, Video } from 'lucide-react'
import { getPortalMeetings, recordMeetingClick } from '@/api/portal'
import type { PortalMeetingDto } from '@/api/portal'

interface Props { projectId: number }

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

function statusBadge(status: string) {
  if (status === 'Completed') return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Completed</Badge>
  if (status === 'Cancelled') return <Badge variant="outline" className="text-muted-foreground line-through">Cancelled</Badge>
  return <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">Scheduled</Badge>
}

function MeetingCard({ meeting, projectId }: { meeting: PortalMeetingDto; projectId: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight">{meeting.title}</CardTitle>
            {meeting.meetingType && (
              <p className="text-xs text-muted-foreground mt-0.5">{meeting.meetingType}</p>
            )}
          </div>
          {statusBadge(meeting.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {meeting.purpose && <p className="text-sm text-muted-foreground">{meeting.purpose}</p>}
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          {meeting.scheduledAt && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(meeting.scheduledAt)}</span>
            </div>
          )}
          {meeting.durationMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{meeting.durationMinutes} min</span>
            </div>
          )}
        </div>
        {meeting.goals && (
          <p className="text-sm"><span className="font-medium">Goals: </span>{meeting.goals}</p>
        )}
        {meeting.meetingUrl && meeting.status !== 'Cancelled' && (
          <Button
            size="sm"
            className="mt-2 gap-1"
            onClick={() => { recordMeetingClick(projectId, meeting.id).catch(() => {}); window.open(meeting.meetingUrl!, '_blank') }}
          >
            <Video className="h-3.5 w-3.5" /> Join Meeting
          </Button>
        )}
        {meeting.recordingUrl && meeting.status === 'Completed' && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1 ml-2"
            onClick={() => { recordMeetingClick(projectId, meeting.id).catch(() => {}); window.open(meeting.recordingUrl!, '_blank') }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> View Recording
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function PortalTrainingsTab({ projectId }: Props) {
  const { data: meetings, isLoading } = useQuery({
    queryKey: ['portal-meetings', projectId],
    queryFn: () => getPortalMeetings(projectId),
  })

  if (isLoading) return <div className="grid gap-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>

  const upcoming = meetings?.filter(m => m.status === 'Scheduled') ?? []
  const past = meetings?.filter(m => m.status !== 'Scheduled') ?? []

  if (!meetings?.length) {
    return <div className="py-16 text-center text-muted-foreground">No training sessions scheduled yet.</div>
  }

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Upcoming</h3>
          <div className="grid gap-3">{upcoming.map(m => <MeetingCard key={m.id} meeting={m} projectId={projectId} />)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Past</h3>
          <div className="grid gap-3">{past.map(m => <MeetingCard key={m.id} meeting={m} projectId={projectId} />)}</div>
        </div>
      )}
    </div>
  )
}
