import apiClient from './client'

export interface SpecialistDto {
  id: string
  name: string
  email: string
}

export interface ProjectDto {
  id: number
  projectType: string
  customerName: string
  salesforceAccountId: string | null
  salesforceProjectId: string | null
  assignedSpecialist: SpecialistDto | null
  status: string
  currentStep: number
  programId: number | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  stateProvince: string | null
  postalCode: string | null
  country: string | null
  timezone: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateProjectPayload {
  projectType: string
  customerName: string
  salesforceAccountId?: string
  salesforceProjectId?: string
  assignedSpecialistId?: string
  programId?: number
}

export async function getProjects(): Promise<ProjectDto[]> {
  const { data } = await apiClient.get<ProjectDto[]>('/projects')
  return data
}

export async function createProject(payload: CreateProjectPayload): Promise<ProjectDto> {
  const { data } = await apiClient.post<ProjectDto>('/projects', payload)
  return data
}

export interface UpdateProjectPayload {
  customerName?: string
  salesforceAccountId?: string
  salesforceProjectId?: string
  assignedSpecialistId?: string
  status?: string
  projectType?: string
  programId?: number
  addressLine1?: string
  addressLine2?: string
  city?: string
  stateProvince?: string
  postalCode?: string
  country?: string
  timezone?: string
}

export async function updateProject(id: number, payload: UpdateProjectPayload): Promise<ProjectDto> {
  const { data } = await apiClient.put<ProjectDto>(`/projects/${id}`, payload)
  return data
}
