import api from './client'

export interface StageProgressDto {
  stageId: number
  stageName: string
  color?: string
  icon?: string
  stageCategory: 'Standard' | 'PostGoLive'
  status: 'NotStarted' | 'InProgress' | 'Complete'
  completedItems: number
  totalItems: number
}

export interface JourneyAssignmentSummaryDto {
  assignmentId: number
  journeyId: number
  journeyName: string
  assignedAt: string
  stageProgress: StageProgressDto[]
  totalMeetings: number
  completedMeetings: number
  totalForms: number
  submittedForms: number
  totalResources: number
  // Integration hooks
  salesforceOpportunityId?: string
  churnZeroAccountId?: string
}

export interface ProjectMeetingDto {
  id: number
  title: string
  meetingType?: string
  purpose?: string
  description?: string
  goals?: string
  scheduledAt?: string
  durationMinutes?: number
  status: 'Scheduled' | 'Completed' | 'Cancelled'
  meetingUrl?: string
  recordingUrl?: string
  sortOrder: number
  journeyItemId?: number
  // Integration hooks
  zoomMeetingId?: string
  zoomJoinUrl?: string
  gongCallId?: string
}

export interface ProjectResourceDto {
  id: number
  title: string
  resourceType?: string
  resourceUrl: string
  sortOrder: number
  journeyItemId?: number
  // Integration hooks
  googleDriveFileId?: string
}

export interface ProjectFormAssignmentDto {
  id: number
  formId: number
  formName: string
  status: 'NotStarted' | 'InProgress' | 'Submitted'
  assignedToUserId?: string
  assignedToName?: string
  sortOrder: number
  journeyItemId?: number
  notes?: string
}

export interface ProjectUserAccessDto {
  id: number
  userId: string
  userName: string
  email: string
  role: string
  grantedAt: string
}

// Journey assignment
export const assignJourney = (projectId: number, journeyId: number, notes?: string) =>
  api.post(`/projects/${projectId}/assign-journey`, { journeyId, notes }).then(r => r.data as JourneyAssignmentSummaryDto)

export const updateJourneyIntegration = (
  projectId: number,
  payload: { salesforceOpportunityId?: string; churnZeroAccountId?: string }
) =>
  api.patch(`/projects/${projectId}/journey/integration`, payload).then(r => r.data as JourneyAssignmentSummaryDto)

export const getJourneyAssignment = (projectId: number) =>
  api.get(`/projects/${projectId}/journey`).then(r => r.data as JourneyAssignmentSummaryDto)

export const removeJourneyAssignment = (projectId: number) =>
  api.delete(`/projects/${projectId}/journey`)

// Meetings
export const getProjectMeetings = (projectId: number) =>
  api.get(`/projects/${projectId}/meetings`).then(r => r.data as ProjectMeetingDto[])

export const createProjectMeeting = (projectId: number, payload: Partial<ProjectMeetingDto>) =>
  api.post(`/projects/${projectId}/meetings`, payload).then(r => r.data as ProjectMeetingDto)

export const updateProjectMeeting = (projectId: number, meetingId: number, payload: Partial<ProjectMeetingDto>) =>
  api.put(`/projects/${projectId}/meetings/${meetingId}`, payload).then(r => r.data as ProjectMeetingDto)

export const deleteProjectMeeting = (projectId: number, meetingId: number) =>
  api.delete(`/projects/${projectId}/meetings/${meetingId}`)

export const updateMeetingStatus = (projectId: number, meetingId: number, status: string) =>
  api.put(`/projects/${projectId}/meetings/${meetingId}/status`, { status }).then(r => r.data as ProjectMeetingDto)

// Resources
export const getProjectResources = (projectId: number) =>
  api.get(`/projects/${projectId}/resources`).then(r => r.data as ProjectResourceDto[])

export const createProjectResource = (projectId: number, payload: Partial<ProjectResourceDto>) =>
  api.post(`/projects/${projectId}/resources`, payload).then(r => r.data as ProjectResourceDto)

export const updateProjectResource = (projectId: number, resourceId: number, payload: Partial<ProjectResourceDto>) =>
  api.put(`/projects/${projectId}/resources/${resourceId}`, payload).then(r => r.data as ProjectResourceDto)

export const deleteProjectResource = (projectId: number, resourceId: number) =>
  api.delete(`/projects/${projectId}/resources/${resourceId}`)

// Form Assignments
export const getProjectFormAssignments = (projectId: number) =>
  api.get(`/projects/${projectId}/form-assignments`).then(r => r.data as ProjectFormAssignmentDto[])

export const createProjectFormAssignment = (projectId: number, payload: { formId: number; assignedToUserId?: string; sortOrder?: number; notes?: string }) =>
  api.post(`/projects/${projectId}/form-assignments`, payload).then(r => r.data as ProjectFormAssignmentDto)

export const updateProjectFormAssignment = (projectId: number, id: number, payload: Partial<ProjectFormAssignmentDto>) =>
  api.put(`/projects/${projectId}/form-assignments/${id}`, payload).then(r => r.data as ProjectFormAssignmentDto)

export const deleteProjectFormAssignment = (projectId: number, id: number) =>
  api.delete(`/projects/${projectId}/form-assignments/${id}`)

// User Access
export const getProjectUsers = (projectId: number) =>
  api.get(`/projects/${projectId}/users`).then(r => r.data as ProjectUserAccessDto[])

export const grantProjectAccess = (projectId: number, userId: string, role: string) =>
  api.post(`/projects/${projectId}/users`, { userId, role }).then(r => r.data as ProjectUserAccessDto)

export const revokeProjectAccess = (projectId: number, userId: string) =>
  api.delete(`/projects/${projectId}/users/${userId}`)

export interface ResourceActivityDto {
  resourceId: number
  title: string
  resourceType?: string
  viewCount: number
  uniqueViewers: number
}

export interface MeetingActivityDto {
  meetingId: number
  title: string
  meetingType?: string
  status: string
  clickCount: number
  uniqueClickers: number
}

export interface FormActivityDto {
  formAssignmentId: number
  formName: string
  status: string
  assignedToName?: string
}

export interface ProjectActivityDto {
  resources: ResourceActivityDto[]
  meetings: MeetingActivityDto[]
  forms: FormActivityDto[]
}

export const getProjectActivity = (projectId: number): Promise<ProjectActivityDto> =>
  api.get(`/projects/${projectId}/activity`).then(r => r.data)
