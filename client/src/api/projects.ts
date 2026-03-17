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
