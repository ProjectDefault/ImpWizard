import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Trash2, Pencil, ExternalLink,
  FileText, Video, Link, Presentation, Wrench, HeartHandshake,
  CheckCircle2, Circle, Loader2
} from 'lucide-react'

import { getProjects } from '@/api/projects'
import { getProjectChangelog } from '@/api/audit'
import { getProfile } from '@/api/profile'
import { formatAuditTimestamp } from '@/lib/formatTimestamp'
import { getJourneys } from '@/api/journeys'
import { getForms } from '@/api/forms'
import { getUsers } from '@/api/users'
import {
  assignJourney, getJourneyAssignment, removeJourneyAssignment,
  getProjectMeetings, createProjectMeeting, updateProjectMeeting, deleteProjectMeeting, updateMeetingStatus,
  getProjectResources, createProjectResource, updateProjectResource, deleteProjectResource,
  getProjectFormAssignments, createProjectFormAssignment, updateProjectFormAssignment, deleteProjectFormAssignment,
  getProjectUsers, grantProjectAccess, revokeProjectAccess,
  getProjectActivity, updateJourneyIntegration,
} from '@/api/projectPortal'
import type {
  ProjectMeetingDto, ProjectResourceDto, ProjectFormAssignmentDto, ProjectUserAccessDto
} from '@/api/projectPortal'

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Complete: 'default',
  Active: 'secondary',
  OnHold: 'outline',
}

const meetingStatusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Completed: 'default',
  Scheduled: 'secondary',
  Cancelled: 'outline',
}

const formStatusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Submitted: 'default',
  InProgress: 'secondary',
  NotStarted: 'outline',
}

function ResourceTypeIcon({ type }: { type?: string }) {
  switch (type) {
    case 'GoogleSlides': return <Presentation className="h-4 w-4" />
    case 'Video': return <Video className="h-4 w-4" />
    case 'Document': return <FileText className="h-4 w-4" />
    case 'CustomerSuccess': return <HeartHandshake className="h-4 w-4" />
    case 'TechnicalSupport': return <Wrench className="h-4 w-4" />
    default: return <Link className="h-4 w-4" />
  }
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const pid = Number(projectId)

  // ── Shared state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview')

  // ── Journey tab state ─────────────────────────────────────────────────────
  const [journeySheetOpen, setJourneySheetOpen] = useState(false)
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('')
  const [journeyNotes, setJourneyNotes] = useState('')

  // ── Meeting tab state ─────────────────────────────────────────────────────
  const [meetingSheetOpen, setMeetingSheetOpen] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<ProjectMeetingDto | null>(null)
  const [meetingForm, setMeetingForm] = useState({
    title: '', meetingType: '', purpose: '', goals: '',
    scheduledAt: '', durationMinutes: '', meetingUrl: '', status: 'Scheduled', recordingUrl: '',
    zoomMeetingId: '', zoomJoinUrl: '', gongCallId: ''
  })

  // ── Resource tab state ────────────────────────────────────────────────────
  const [resourceSheetOpen, setResourceSheetOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<ProjectResourceDto | null>(null)
  const [resourceForm, setResourceForm] = useState({ title: '', resourceType: '', resourceUrl: '', googleDriveFileId: '' })
  const [integrationForm, setIntegrationForm] = useState({ salesforceOpportunityId: '', churnZeroAccountId: '' })
  const [integrationEditing, setIntegrationEditing] = useState(false)

  // ── Form assignment tab state ─────────────────────────────────────────────
  const [formSheetOpen, setFormSheetOpen] = useState(false)
  const [editingFormAssignment, setEditingFormAssignment] = useState<ProjectFormAssignmentDto | null>(null)
  const [formAssignForm, setFormAssignForm] = useState({
    formId: '', assignedToUserId: '', notes: '', status: 'NotStarted'
  })

  // ── Access tab state ──────────────────────────────────────────────────────
  const [accessSheetOpen, setAccessSheetOpen] = useState(false)
  const [accessForm, setAccessForm] = useState({ userId: '', role: 'Customer' })

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })
  const project = projects.find(p => p.id === pid)

  const { data: journeyAssignment, isLoading: journeyLoading } = useQuery({
    queryKey: ['project-journey', pid],
    queryFn: () => getJourneyAssignment(pid),
    retry: false,
    // 404 means no assignment — treat as undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    throwOnError: (err: any) => err?.response?.status !== 404,
  })

  const { data: journeys = [] } = useQuery({
    queryKey: ['journeys'],
    queryFn: getJourneys,
    enabled: journeySheetOpen,
  })

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['project-meetings', pid],
    queryFn: () => getProjectMeetings(pid),
    enabled: activeTab === 'meetings',
  })

  const { data: resources = [], isLoading: resourcesLoading } = useQuery({
    queryKey: ['project-resources', pid],
    queryFn: () => getProjectResources(pid),
    enabled: activeTab === 'resources',
  })

  const { data: formAssignments = [], isLoading: formAssignmentsLoading } = useQuery({
    queryKey: ['project-form-assignments', pid],
    queryFn: () => getProjectFormAssignments(pid),
    enabled: activeTab === 'forms',
  })

  const { data: projectUsers = [], isLoading: projectUsersLoading } = useQuery({
    queryKey: ['project-users', pid],
    queryFn: () => getProjectUsers(pid),
    enabled: activeTab === 'access',
  })

  const { data: allForms = [] } = useQuery({
    queryKey: ['forms'],
    queryFn: getForms,
    enabled: formSheetOpen,
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: formSheetOpen || accessSheetOpen,
  })

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['project-activity', pid],
    queryFn: () => getProjectActivity(pid),
    enabled: activeTab === 'activity',
  })

  const { data: changelog, isLoading: changelogLoading } = useQuery({
    queryKey: ['project-changelog', pid],
    queryFn: () => getProjectChangelog(pid),
    enabled: activeTab === 'changelog',
  })

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const assignJourneyMutation = useMutation({
    mutationFn: () => assignJourney(pid, Number(selectedJourneyId), journeyNotes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      qc.invalidateQueries({ queryKey: ['project-meetings', pid] })
      qc.invalidateQueries({ queryKey: ['project-resources', pid] })
      qc.invalidateQueries({ queryKey: ['project-form-assignments', pid] })
      toast.success('Journey assigned successfully.')
      setJourneySheetOpen(false)
      setSelectedJourneyId('')
      setJourneyNotes('')
    },
    onError: () => toast.error('Failed to assign journey.'),
  })

  const removeJourneyMutation = useMutation({
    mutationFn: () => removeJourneyAssignment(pid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      toast.success('Journey assignment removed.')
    },
    onError: () => toast.error('Failed to remove journey assignment.'),
  })

  const updateIntegrationMutation = useMutation({
    mutationFn: () => updateJourneyIntegration(pid, {
      salesforceOpportunityId: integrationForm.salesforceOpportunityId || undefined,
      churnZeroAccountId: integrationForm.churnZeroAccountId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      setIntegrationEditing(false)
      toast.success('Integration IDs saved.')
    },
    onError: () => toast.error('Failed to save integration IDs.'),
  })

  const createMeetingMutation = useMutation({
    mutationFn: (payload: Partial<ProjectMeetingDto>) => createProjectMeeting(pid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-meetings', pid] })
      toast.success('Meeting created.')
      setMeetingSheetOpen(false)
    },
    onError: () => toast.error('Failed to create meeting.'),
  })

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProjectMeetingDto> }) =>
      updateProjectMeeting(pid, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-meetings', pid] })
      toast.success('Meeting updated.')
      setMeetingSheetOpen(false)
      setEditingMeeting(null)
    },
    onError: () => toast.error('Failed to update meeting.'),
  })

  const deleteMeetingMutation = useMutation({
    mutationFn: (id: number) => deleteProjectMeeting(pid, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-meetings', pid] })
      toast.success('Meeting deleted.')
    },
    onError: () => toast.error('Failed to delete meeting.'),
  })

  const updateMeetingStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateMeetingStatus(pid, id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-meetings', pid] })
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      toast.success('Status updated.')
    },
    onError: () => toast.error('Failed to update status.'),
  })

  const createResourceMutation = useMutation({
    mutationFn: (payload: Partial<ProjectResourceDto>) => createProjectResource(pid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-resources', pid] })
      toast.success('Resource created.')
      setResourceSheetOpen(false)
    },
    onError: () => toast.error('Failed to create resource.'),
  })

  const updateResourceMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProjectResourceDto> }) =>
      updateProjectResource(pid, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-resources', pid] })
      toast.success('Resource updated.')
      setResourceSheetOpen(false)
      setEditingResource(null)
    },
    onError: () => toast.error('Failed to update resource.'),
  })

  const deleteResourceMutation = useMutation({
    mutationFn: (id: number) => deleteProjectResource(pid, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-resources', pid] })
      toast.success('Resource deleted.')
    },
    onError: () => toast.error('Failed to delete resource.'),
  })

  const createFormAssignmentMutation = useMutation({
    mutationFn: (payload: { formId: number; assignedToUserId?: string; notes?: string }) =>
      createProjectFormAssignment(pid, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-form-assignments', pid] })
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      toast.success('Form assigned.')
      setFormSheetOpen(false)
    },
    onError: () => toast.error('Failed to assign form.'),
  })

  const updateFormAssignmentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ProjectFormAssignmentDto> }) =>
      updateProjectFormAssignment(pid, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-form-assignments', pid] })
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      toast.success('Form assignment updated.')
      setFormSheetOpen(false)
      setEditingFormAssignment(null)
    },
    onError: () => toast.error('Failed to update form assignment.'),
  })

  const deleteFormAssignmentMutation = useMutation({
    mutationFn: (id: number) => deleteProjectFormAssignment(pid, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-form-assignments', pid] })
      qc.invalidateQueries({ queryKey: ['project-journey', pid] })
      toast.success('Form assignment deleted.')
    },
    onError: () => toast.error('Failed to delete form assignment.'),
  })

  const grantAccessMutation = useMutation({
    mutationFn: () => grantProjectAccess(pid, accessForm.userId, accessForm.role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-users', pid] })
      toast.success('Access granted.')
      setAccessSheetOpen(false)
      setAccessForm({ userId: '', role: 'Customer' })
    },
    onError: () => toast.error('Failed to grant access.'),
  })

  const revokeAccessMutation = useMutation({
    mutationFn: (userId: string) => revokeProjectAccess(pid, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-users', pid] })
      toast.success('Access revoked.')
    },
    onError: () => toast.error('Failed to revoke access.'),
  })

  // ── Helper: open meeting sheet ─────────────────────────────────────────────
  function openCreateMeeting() {
    setEditingMeeting(null)
    setMeetingForm({ title: '', meetingType: '', purpose: '', goals: '', scheduledAt: '', durationMinutes: '', meetingUrl: '', status: 'Scheduled', recordingUrl: '', zoomMeetingId: '', zoomJoinUrl: '', gongCallId: '' })
    setMeetingSheetOpen(true)
  }

  function openEditMeeting(m: ProjectMeetingDto) {
    setEditingMeeting(m)
    setMeetingForm({
      title: m.title,
      meetingType: m.meetingType ?? '',
      purpose: m.purpose ?? '',
      goals: m.goals ?? '',
      scheduledAt: m.scheduledAt ? m.scheduledAt.slice(0, 16) : '',
      durationMinutes: m.durationMinutes?.toString() ?? '',
      meetingUrl: m.meetingUrl ?? '',
      status: m.status,
      recordingUrl: m.recordingUrl ?? '',
      zoomMeetingId: m.zoomMeetingId ?? '',
      zoomJoinUrl: m.zoomJoinUrl ?? '',
      gongCallId: m.gongCallId ?? '',
    })
    setMeetingSheetOpen(true)
  }

  function submitMeetingForm() {
    const payload: Partial<ProjectMeetingDto> = {
      title: meetingForm.title,
      meetingType: meetingForm.meetingType || undefined,
      purpose: meetingForm.purpose || undefined,
      goals: meetingForm.goals || undefined,
      scheduledAt: meetingForm.scheduledAt || undefined,
      durationMinutes: meetingForm.durationMinutes ? Number(meetingForm.durationMinutes) : undefined,
      meetingUrl: meetingForm.meetingUrl || undefined,
      recordingUrl: meetingForm.recordingUrl || undefined,
      status: meetingForm.status as ProjectMeetingDto['status'],
      zoomMeetingId: meetingForm.zoomMeetingId || undefined,
      zoomJoinUrl: meetingForm.zoomJoinUrl || undefined,
      gongCallId: meetingForm.gongCallId || undefined,
    }
    if (editingMeeting) {
      updateMeetingMutation.mutate({ id: editingMeeting.id, payload })
    } else {
      createMeetingMutation.mutate(payload)
    }
  }

  function openCreateResource() {
    setEditingResource(null)
    setResourceForm({ title: '', resourceType: '', resourceUrl: '', googleDriveFileId: '' })
    setResourceSheetOpen(true)
  }

  function openEditResource(r: ProjectResourceDto) {
    setEditingResource(r)
    setResourceForm({ title: r.title, resourceType: r.resourceType ?? '', resourceUrl: r.resourceUrl, googleDriveFileId: r.googleDriveFileId ?? '' })
    setResourceSheetOpen(true)
  }

  function submitResourceForm() {
    const payload: Partial<ProjectResourceDto> = {
      title: resourceForm.title,
      resourceType: resourceForm.resourceType || undefined,
      resourceUrl: resourceForm.resourceUrl,
      googleDriveFileId: resourceForm.googleDriveFileId || undefined,
    }
    if (editingResource) {
      updateResourceMutation.mutate({ id: editingResource.id, payload })
    } else {
      createResourceMutation.mutate(payload)
    }
  }

  function openCreateFormAssignment() {
    setEditingFormAssignment(null)
    setFormAssignForm({ formId: '', assignedToUserId: '', notes: '', status: 'NotStarted' })
    setFormSheetOpen(true)
  }

  function openEditFormAssignment(fa: ProjectFormAssignmentDto) {
    setEditingFormAssignment(fa)
    setFormAssignForm({
      formId: fa.formId.toString(),
      assignedToUserId: fa.assignedToUserId ?? '',
      notes: fa.notes ?? '',
      status: fa.status,
    })
    setFormSheetOpen(true)
  }

  function submitFormAssignmentForm() {
    if (editingFormAssignment) {
      updateFormAssignmentMutation.mutate({
        id: editingFormAssignment.id,
        payload: {
          status: formAssignForm.status as ProjectFormAssignmentDto['status'],
          assignedToUserId: formAssignForm.assignedToUserId || undefined,
          notes: formAssignForm.notes || undefined,
        },
      })
    } else {
      createFormAssignmentMutation.mutate({
        formId: Number(formAssignForm.formId),
        assignedToUserId: formAssignForm.assignedToUserId || undefined,
        notes: formAssignForm.notes || undefined,
      })
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (projectsLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Project not found.</p>
        <Button variant="ghost" onClick={() => navigate('/admin/projects')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/projects')} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Projects
          </Button>
          <h1 className="text-2xl font-semibold">{project.customerName}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusVariant[project.status] ?? 'outline'}>{project.status}</Badge>
            <Badge variant="outline" className="text-xs">{project.projectType}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="journey">Journey</TabsTrigger>
          <TabsTrigger value="meetings">Meetings</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="forms">Forms</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Customer Name</p>
              <p className="font-medium">{project.customerName}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={statusVariant[project.status] ?? 'outline'}>{project.status}</Badge>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Project Type</p>
              <p className="font-medium">{project.projectType}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Assigned Specialist</p>
              <p className="font-medium">{project.assignedSpecialist?.name ?? 'Unassigned'}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Salesforce Account ID</p>
              <p className="font-medium text-sm">{project.salesforceAccountId ?? '—'}</p>
            </div>
            <div className="rounded-lg border p-4 space-y-1">
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="font-medium text-sm">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </TabsContent>

        {/* ── Journey Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="journey" className="pt-4">
          {journeyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : journeyAssignment ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{journeyAssignment.journeyName}</h2>
                  <p className="text-sm text-muted-foreground">
                    Assigned {new Date(journeyAssignment.assignedAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (confirm('Remove journey assignment? This will not delete instantiated meetings, resources, or forms.')) {
                      removeJourneyMutation.mutate()
                    }
                  }}
                  disabled={removeJourneyMutation.isPending}
                >
                  {removeJourneyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Remove Assignment
                </Button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{journeyAssignment.completedMeetings}/{journeyAssignment.totalMeetings}</p>
                  <p className="text-xs text-muted-foreground">Meetings Completed</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{journeyAssignment.submittedForms}/{journeyAssignment.totalForms}</p>
                  <p className="text-xs text-muted-foreground">Forms Submitted</p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold">{journeyAssignment.totalResources}</p>
                  <p className="text-xs text-muted-foreground">Resources</p>
                </div>
              </div>

              {/* Integration IDs */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Integration IDs</p>
                  {!integrationEditing ? (
                    <Button size="sm" variant="ghost" onClick={() => {
                      setIntegrationForm({
                        salesforceOpportunityId: journeyAssignment.salesforceOpportunityId ?? '',
                        churnZeroAccountId: journeyAssignment.churnZeroAccountId ?? '',
                      })
                      setIntegrationEditing(true)
                    }}>Edit</Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setIntegrationEditing(false)}>Cancel</Button>
                      <Button size="sm" onClick={() => updateIntegrationMutation.mutate()} disabled={updateIntegrationMutation.isPending}>Save</Button>
                    </div>
                  )}
                </div>
                {integrationEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Salesforce Opportunity ID</Label>
                      <Input value={integrationForm.salesforceOpportunityId} onChange={e => setIntegrationForm(f => ({ ...f, salesforceOpportunityId: e.target.value }))} placeholder="0061U000..." />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">ChurnZero Account ID</Label>
                      <Input value={integrationForm.churnZeroAccountId} onChange={e => setIntegrationForm(f => ({ ...f, churnZeroAccountId: e.target.value }))} placeholder="cz_account_..." />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Salesforce Opportunity</p>
                      <p className="font-mono text-xs mt-0.5">{journeyAssignment.salesforceOpportunityId ?? <span className="text-muted-foreground italic">not set</span>}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">ChurnZero Account</p>
                      <p className="font-mono text-xs mt-0.5">{journeyAssignment.churnZeroAccountId ?? <span className="text-muted-foreground italic">not set</span>}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Stage progress */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Stage Progress</h3>
                <div className="flex flex-wrap gap-3">
                  {journeyAssignment.stageProgress.map(stage => (
                    <div
                      key={stage.stageId}
                      className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                      style={{ borderColor: stage.color ?? undefined }}
                    >
                      {stage.status === 'Complete' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : stage.status === 'InProgress' ? (
                        <Loader2 className="h-4 w-4 text-yellow-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium">{stage.stageName}</span>
                      {stage.totalItems > 0 && (
                        <span className="text-muted-foreground text-xs">{stage.completedItems}/{stage.totalItems}</span>
                      )}
                      {stage.stageCategory === 'PostGoLive' && (
                        <Badge variant="outline" className="text-xs">Post Go-Live</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <p className="text-muted-foreground">No journey assigned to this project yet.</p>
              <Button onClick={() => setJourneySheetOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Assign Journey
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ── Meetings Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="meetings" className="pt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateMeeting}>
              <Plus className="h-4 w-4 mr-1" /> Add Meeting
            </Button>
          </div>
          {meetingsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : meetings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No meetings yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {meetings.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.meetingType ?? '—'}</TableCell>
                      <TableCell className="text-sm">
                        {m.scheduledAt ? new Date(m.scheduledAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell className="text-sm">{m.durationMinutes ? `${m.durationMinutes}m` : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={meetingStatusVariant[m.status] ?? 'outline'}>{m.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {m.meetingUrl ? (
                          <a href={m.meetingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline max-w-[120px] truncate">
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {m.meetingUrl}
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Select
                            value={m.status}
                            onValueChange={v => updateMeetingStatusMutation.mutate({ id: m.id, status: v })}
                          >
                            <SelectTrigger className="h-7 w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Scheduled">Scheduled</SelectItem>
                              <SelectItem value="Completed">Completed</SelectItem>
                              <SelectItem value="Cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditMeeting(m)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                            if (confirm('Delete this meeting?')) deleteMeetingMutation.mutate(m.id)
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Resources Tab ────────────────────────────────────────────────── */}
        <TabsContent value="resources" className="pt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateResource}>
              <Plus className="h-4 w-4 mr-1" /> Add Resource
            </Button>
          </div>
          {resourcesLoading ? (
            <div className="grid grid-cols-3 gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
          ) : resources.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No resources yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.map(r => (
                <div key={r.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <ResourceTypeIcon type={r.resourceType} />
                    <span className="font-medium text-sm truncate">{r.title}</span>
                  </div>
                  {r.resourceType && (
                    <Badge variant="outline" className="text-xs">{r.resourceType}</Badge>
                  )}
                  <a
                    href={r.resourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline truncate"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{r.resourceUrl}</span>
                  </a>
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditResource(r)}>
                      <Pencil className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => {
                      if (confirm('Delete this resource?')) deleteResourceMutation.mutate(r.id)
                    }}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Forms Tab ────────────────────────────────────────────────────── */}
        <TabsContent value="forms" className="pt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreateFormAssignment}>
              <Plus className="h-4 w-4 mr-1" /> Add Form
            </Button>
          </div>
          {formAssignmentsLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : formAssignments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No form assignments yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Form Name</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {formAssignments.map(fa => (
                    <TableRow key={fa.id}>
                      <TableCell className="font-medium">{fa.formName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fa.assignedToName ?? 'Unassigned'}</TableCell>
                      <TableCell>
                        <Badge variant={formStatusVariant[fa.status] ?? 'outline'}>{fa.status}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{fa.notes ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditFormAssignment(fa)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => {
                            if (confirm('Delete this form assignment?')) deleteFormAssignmentMutation.mutate(fa.id)
                          }}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Access Tab ───────────────────────────────────────────────────── */}
        <TabsContent value="access" className="pt-4 space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setAccessForm({ userId: '', role: 'Customer' }); setAccessSheetOpen(true) }}>
              <Plus className="h-4 w-4 mr-1" /> Grant Access
            </Button>
          </div>
          {projectUsersLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : projectUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No users have access to this project.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectUsers.map((u: ProjectUserAccessDto) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.userName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{u.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.grantedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm('Revoke access for this user?')) revokeAccessMutation.mutate(u.userId)
                          }}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ── Activity Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="activity" className="pt-4">
          {activityLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !activity ? (
            <div className="text-center text-muted-foreground py-8">No activity data available.</div>
          ) : (
            <div className="space-y-8">
              {/* Resources */}
              <div>
                <h3 className="font-medium mb-3">Resource Views</h3>
                {activity.resources.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No resources yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Views</TableHead>
                        <TableHead className="text-right">Unique Viewers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.resources.map(r => (
                        <TableRow key={r.resourceId}>
                          <TableCell className="font-medium">{r.title}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{r.resourceType ?? '—'}</Badge></TableCell>
                          <TableCell className="text-right">{r.viewCount}</TableCell>
                          <TableCell className="text-right">{r.uniqueViewers}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Meetings */}
              <div>
                <h3 className="font-medium mb-3">Meeting Link Clicks</h3>
                {activity.meetings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No meetings yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Total Clicks</TableHead>
                        <TableHead className="text-right">Unique Clickers</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.meetings.map(m => (
                        <TableRow key={m.meetingId}>
                          <TableCell className="font-medium">{m.title}</TableCell>
                          <TableCell><Badge variant={meetingStatusVariant[m.status] ?? 'outline'} className="text-xs">{m.status}</Badge></TableCell>
                          <TableCell className="text-right">{m.clickCount}</TableCell>
                          <TableCell className="text-right">{m.uniqueClickers}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Forms */}
              <div>
                <h3 className="font-medium mb-3">Form Submissions</h3>
                {activity.forms.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No forms assigned yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Form</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Assigned To</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activity.forms.map(f => (
                        <TableRow key={f.formAssignmentId}>
                          <TableCell className="font-medium">{f.formName}</TableCell>
                          <TableCell><Badge variant={formStatusVariant[f.status] ?? 'outline'} className="text-xs">{f.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{f.assignedToName ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Changelog Tab ────────────────────────────────────────────────── */}
        <TabsContent value="changelog" className="pt-4">
          {changelogLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : !changelog || changelog.length === 0 ? (
            <div className="text-sm text-muted-foreground">No changelog entries yet.</div>
          ) : (
            <div className="rounded-md border divide-y">
              {changelog.map(entry => (
                <div key={entry.id} className="p-3 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{entry.userFullName}</span>
                      <Badge variant="outline" className="text-xs">{entry.userRole}</Badge>
                      <Badge variant="secondary" className="text-xs">{entry.action}</Badge>
                    </div>
                    {(entry.entityName || entry.detail) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.entityName && <span className="font-medium">{entry.entityName}</span>}
                        {entry.entityName && entry.detail && ' — '}
                        {entry.detail}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {formatAuditTimestamp(entry.timestamp, profile?.timeZoneId)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Journey Assign Sheet ────────────────────────────────────────────── */}
      <Sheet open={journeySheetOpen} onOpenChange={setJourneySheetOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader><SheetTitle>Assign Journey</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Journey</Label>
              <Select value={selectedJourneyId} onValueChange={setSelectedJourneyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a journey..." />
                </SelectTrigger>
                <SelectContent>
                  {journeys.filter(j => j.isActive).map(j => (
                    <SelectItem key={j.id} value={j.id.toString()}>{j.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this assignment..."
                value={journeyNotes}
                onChange={e => setJourneyNotes(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setJourneySheetOpen(false)}>Cancel</Button>
            <Button
              disabled={!selectedJourneyId || assignJourneyMutation.isPending}
              onClick={() => assignJourneyMutation.mutate()}
            >
              {assignJourneyMutation.isPending ? 'Assigning...' : 'Assign'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Meeting Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={meetingSheetOpen} onOpenChange={open => { setMeetingSheetOpen(open); if (!open) setEditingMeeting(null) }}>
        <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
          <SheetHeader><SheetTitle>{editingMeeting ? 'Edit Meeting' : 'Add Meeting'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={meetingForm.title} onChange={e => setMeetingForm(f => ({ ...f, title: e.target.value }))} placeholder="Meeting title" />
            </div>
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Input value={meetingForm.meetingType} onChange={e => setMeetingForm(f => ({ ...f, meetingType: e.target.value }))} placeholder="e.g. Kickoff, Training" />
            </div>
            <div className="space-y-2">
              <Label>Purpose</Label>
              <Textarea value={meetingForm.purpose} onChange={e => setMeetingForm(f => ({ ...f, purpose: e.target.value }))} placeholder="Meeting purpose..." />
            </div>
            <div className="space-y-2">
              <Label>Goals</Label>
              <Textarea value={meetingForm.goals} onChange={e => setMeetingForm(f => ({ ...f, goals: e.target.value }))} placeholder="Meeting goals..." />
            </div>
            <div className="space-y-2">
              <Label>Scheduled At</Label>
              <Input type="datetime-local" value={meetingForm.scheduledAt} onChange={e => setMeetingForm(f => ({ ...f, scheduledAt: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Input type="number" value={meetingForm.durationMinutes} onChange={e => setMeetingForm(f => ({ ...f, durationMinutes: e.target.value }))} placeholder="60" />
            </div>
            <div className="space-y-2">
              <Label>Meeting URL</Label>
              <Input value={meetingForm.meetingUrl} onChange={e => setMeetingForm(f => ({ ...f, meetingUrl: e.target.value }))} placeholder="https://zoom.us/..." />
            </div>
            {editingMeeting && (
              <>
                <div className="space-y-2">
                  <Label>Recording URL</Label>
                  <Input value={meetingForm.recordingUrl} onChange={e => setMeetingForm(f => ({ ...f, recordingUrl: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={meetingForm.status} onValueChange={v => setMeetingForm(f => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {/* Integration hooks */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Integration Hooks</p>
              <div className="space-y-2">
                <Label>Zoom Meeting ID</Label>
                <Input value={meetingForm.zoomMeetingId} onChange={e => setMeetingForm(f => ({ ...f, zoomMeetingId: e.target.value }))} placeholder="zoom_meeting_id" />
              </div>
              <div className="space-y-2">
                <Label>Zoom Join URL</Label>
                <Input value={meetingForm.zoomJoinUrl} onChange={e => setMeetingForm(f => ({ ...f, zoomJoinUrl: e.target.value }))} placeholder="https://zoom.us/j/..." />
              </div>
              <div className="space-y-2">
                <Label>Gong Call ID</Label>
                <Input value={meetingForm.gongCallId} onChange={e => setMeetingForm(f => ({ ...f, gongCallId: e.target.value }))} placeholder="gong_call_id" />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setMeetingSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={!meetingForm.title.trim() || createMeetingMutation.isPending || updateMeetingMutation.isPending}
              onClick={submitMeetingForm}
            >
              {editingMeeting ? 'Save Changes' : 'Add Meeting'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Resource Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={resourceSheetOpen} onOpenChange={open => { setResourceSheetOpen(open); if (!open) setEditingResource(null) }}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader><SheetTitle>{editingResource ? 'Edit Resource' : 'Add Resource'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input value={resourceForm.title} onChange={e => setResourceForm(f => ({ ...f, title: e.target.value }))} placeholder="Resource title" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={resourceForm.resourceType} onValueChange={v => setResourceForm(f => ({ ...f, resourceType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GoogleSlides">Google Slides</SelectItem>
                  <SelectItem value="Video">Video</SelectItem>
                  <SelectItem value="Document">Document</SelectItem>
                  <SelectItem value="Link">Link</SelectItem>
                  <SelectItem value="CustomerSuccess">Customer Success</SelectItem>
                  <SelectItem value="TechnicalSupport">Technical Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>URL *</Label>
              <Input value={resourceForm.resourceUrl} onChange={e => setResourceForm(f => ({ ...f, resourceUrl: e.target.value }))} placeholder="https://..." />
            </div>
            {/* Integration hooks */}
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Integration Hooks</p>
              <div className="space-y-2">
                <Label>Google Drive File ID</Label>
                <Input value={resourceForm.googleDriveFileId} onChange={e => setResourceForm(f => ({ ...f, googleDriveFileId: e.target.value }))} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" />
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setResourceSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={!resourceForm.title.trim() || !resourceForm.resourceUrl.trim() || createResourceMutation.isPending || updateResourceMutation.isPending}
              onClick={submitResourceForm}
            >
              {editingResource ? 'Save Changes' : 'Add Resource'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Form Assignment Sheet ────────────────────────────────────────────── */}
      <Sheet open={formSheetOpen} onOpenChange={open => { setFormSheetOpen(open); if (!open) setEditingFormAssignment(null) }}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader><SheetTitle>{editingFormAssignment ? 'Edit Form Assignment' : 'Assign Form'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            {!editingFormAssignment && (
              <div className="space-y-2">
                <Label>Form *</Label>
                <Select value={formAssignForm.formId} onValueChange={v => setFormAssignForm(f => ({ ...f, formId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select form..." /></SelectTrigger>
                  <SelectContent>
                    {allForms.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editingFormAssignment && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formAssignForm.status} onValueChange={v => setFormAssignForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NotStarted">Not Started</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select value={formAssignForm.assignedToUserId} onValueChange={v => setFormAssignForm(f => ({ ...f, assignedToUserId: v }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={formAssignForm.notes} onChange={e => setFormAssignForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setFormSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={
                (!editingFormAssignment && !formAssignForm.formId) ||
                createFormAssignmentMutation.isPending ||
                updateFormAssignmentMutation.isPending
              }
              onClick={submitFormAssignmentForm}
            >
              {editingFormAssignment ? 'Save Changes' : 'Assign Form'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Access Grant Sheet ───────────────────────────────────────────────── */}
      <Sheet open={accessSheetOpen} onOpenChange={setAccessSheetOpen}>
        <SheetContent className="w-[400px] sm:max-w-[400px]">
          <SheetHeader><SheetTitle>Grant Project Access</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>User *</Label>
              <Select value={accessForm.userId} onValueChange={v => setAccessForm(f => ({ ...f, userId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select user..." /></SelectTrigger>
                <SelectContent>
                  {allUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={accessForm.role} onValueChange={v => setAccessForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SuperCustomer">Super Customer</SelectItem>
                  <SelectItem value="Customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setAccessSheetOpen(false)}>Cancel</Button>
            <Button
              disabled={!accessForm.userId || grantAccessMutation.isPending}
              onClick={() => grantAccessMutation.mutate()}
            >
              {grantAccessMutation.isPending ? 'Granting...' : 'Grant Access'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
