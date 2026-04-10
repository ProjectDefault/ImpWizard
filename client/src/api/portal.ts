import api from './client'
import type { StageProgressDto } from './projectPortal'

export interface PortalProjectDto {
  id: number
  name: string
  status?: string
  programName?: string
  programColor?: string
  hasJourney: boolean
  stageProgress: StageProgressDto[]
}

export interface PortalMeetingDto {
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
}

export interface PortalResourceDto {
  id: number
  title: string
  resourceType?: string
  resourceUrl: string
  sortOrder: number
}

export interface PortalFormAssignmentDto {
  id: number
  formId: number
  formName: string
  status: 'NotStarted' | 'InProgress' | 'Submitted'
  assignedToUserId?: string
  assignedToName?: string
  sortOrder: number
  notes?: string
}

export interface PortalTeamMemberDto {
  accessId: number
  userId: string
  name: string
  email: string
  role: string
}

export const getPortalProjects = (): Promise<PortalProjectDto[]> =>
  api.get('/portal/projects').then(r => r.data)

export const getPortalProject = (id: number): Promise<PortalProjectDto> =>
  api.get(`/portal/projects/${id}`).then(r => r.data)

export const getPortalMeetings = (projectId: number): Promise<PortalMeetingDto[]> =>
  api.get(`/portal/projects/${projectId}/meetings`).then(r => r.data)

export const getPortalResources = (projectId: number): Promise<PortalResourceDto[]> =>
  api.get(`/portal/projects/${projectId}/resources`).then(r => r.data)

export const getPortalPostGoLiveResources = (projectId: number): Promise<PortalResourceDto[]> =>
  api.get(`/portal/projects/${projectId}/post-golive-resources`).then(r => r.data)

export const getPortalForms = (projectId: number): Promise<PortalFormAssignmentDto[]> =>
  api.get(`/portal/projects/${projectId}/forms`).then(r => r.data)

export const getPortalTeam = (projectId: number): Promise<PortalTeamMemberDto[]> =>
  api.get(`/portal/projects/${projectId}/team`).then(r => r.data)

export const inviteToProject = (projectId: number, userId: string, role: string): Promise<PortalTeamMemberDto> =>
  api.post(`/portal/projects/${projectId}/team/invite`, { userId, role }).then(r => r.data)

export const removeFromProject = (projectId: number, userId: string): Promise<void> =>
  api.delete(`/portal/projects/${projectId}/team/${userId}`).then(() => undefined)

export const assignFormToUser = (projectId: number, formAssignmentId: number, assignedToUserId: string | null): Promise<PortalFormAssignmentDto> =>
  api.put(`/portal/projects/${projectId}/forms/${formAssignmentId}/assign`, { assignedToUserId }).then(r => r.data)

export interface FormWithFieldsDto {
  id: number
  name: string
  description?: string
  status: string
  allowFileSubmission: boolean
  fields: FormFieldForFillDto[]
}

export interface FormFieldForFillDto {
  id: number
  label: string
  fieldType: string
  isRequired: boolean
  sortOrder: number
  dataSourceType: string
  dataSourceId?: number
  maxLength?: number
  crossFormPreFillFormId?: number
  crossFormPreFillFieldId?: number
  dataSourceFormId?: number
  dataSourceFieldId?: number
  allowCustomValue: boolean
  autoFillValue?: string | null
  dependsOnFieldId?: number | null
  isCatalogItemSource: boolean
  catalogAutoFillColumn?: string | null
}

export const getDropdownOptions = (dataSourceType: string, dataSourceId?: number | null, parentValue?: string | null): Promise<string[]> =>
  api.get('/portal/dropdown-options', { params: { dataSourceType, dataSourceId, parentValue } }).then(r => r.data)

export interface CatalogItemLookupDto {
  found: boolean
  itemName: string | null
  itemCategory: string | null
  vendorSku: string | null
  purchaseUomDescription: string | null
  uomName: string | null
  suggestedUomName: string | null
}

export const getCatalogItemLookup = (itemName: string, projectId: number): Promise<CatalogItemLookupDto> =>
  api.get('/portal/catalog-item-lookup', { params: { itemName, projectId } }).then(r => r.data)

export interface ProjectSubmissionAnswerDto {
  answerId: number
  fieldId: number
  fieldLabel: string
  value: string
}

export interface ProjectSubmissionRowDto {
  submissionId: number
  submittedByName: string | null
  submittedAt: string | null
  answers: ProjectSubmissionAnswerDto[]
}

export interface ProjectSubmissionFormDto {
  formId: number
  formName: string
  submissions: ProjectSubmissionRowDto[]
}

export const getCrossFormPrefill = (projectId: number, sourceFormId: number, sourceFieldId: number): Promise<{ value: string | null }> =>
  api.get(`/portal/projects/${projectId}/cross-form-data`, { params: { sourceFormId, sourceFieldId, mode: 'prefill' } }).then(r => r.data)

export const getCrossFormDropdown = (projectId: number, sourceFormId: number, sourceFieldId: number): Promise<string[]> =>
  api.get(`/portal/projects/${projectId}/cross-form-data`, { params: { sourceFormId, sourceFieldId, mode: 'dropdown' } }).then(r => r.data)

export const getProjectSubmissionData = (projectId: number): Promise<ProjectSubmissionFormDto[]> =>
  api.get(`/portal/projects/${projectId}/submission-data`).then(r => r.data)

export const updateSubmissionAnswer = (projectId: number, answerId: number, value: string): Promise<{ id: number; value: string }> =>
  api.put(`/portal/projects/${projectId}/submission-data/${answerId}`, { value }).then(r => r.data)

export interface FormSubmissionDto {
  id: number
  projectFormAssignmentId: number
  status: 'Draft' | 'Submitted'
  submittedAt?: string
  createdAt: string
  updatedAt: string
  answers: FormSubmissionAnswerDto[]
}

export interface FormSubmissionAnswerDto {
  id: number
  formFieldId: number
  value: string
}

export const getFormDetail = (projectId: number, assignmentId: number): Promise<FormWithFieldsDto> =>
  api.get(`/portal/projects/${projectId}/forms/${assignmentId}/detail`).then(r => r.data)

export const getFormSubmission = (projectId: number, assignmentId: number): Promise<FormSubmissionDto> =>
  api.get(`/portal/projects/${projectId}/forms/${assignmentId}/submission`).then(r => r.data)

export const saveFormDraft = (
  projectId: number,
  assignmentId: number,
  answers: { formFieldId: number; value: string }[]
): Promise<FormSubmissionDto> =>
  api.post(`/portal/projects/${projectId}/forms/${assignmentId}/submission`, { answers }).then(r => r.data)

export const submitForm = (
  projectId: number,
  assignmentId: number,
  answers: { formFieldId: number; value: string }[]
): Promise<FormSubmissionDto> =>
  api.put(`/portal/projects/${projectId}/forms/${assignmentId}/submission/submit`, { answers }).then(r => r.data)

export const recordResourceView = (projectId: number, resourceId: number): Promise<void> =>
  api.post(`/portal/projects/${projectId}/resources/${resourceId}/view`).then(() => undefined)

export const recordMeetingClick = (projectId: number, meetingId: number): Promise<void> =>
  api.post(`/portal/projects/${projectId}/meetings/${meetingId}/click`).then(() => undefined)
