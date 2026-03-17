import apiClient from './client'

export interface ProgramDto {
  id: number
  name: string
  description: string | null
  color: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ProgramUserDto {
  userId: string
  fullName: string
  email: string
}

export interface ProgramDetailDto extends ProgramDto {
  implementationTypeCount: number
  formCount: number
  importTemplateCount: number
  projectCount: number
  restrictedUsers: ProgramUserDto[]
}

export interface EligibleUserDto {
  userId: string
  fullName: string
  email: string
  isAssigned: boolean
}

export interface CreateProgramPayload {
  name: string
  description?: string
  color?: string
}

export interface UpdateProgramPayload {
  name?: string
  description?: string
  color?: string
  isActive?: boolean
}

export async function getPrograms(): Promise<ProgramDto[]> {
  const { data } = await apiClient.get<ProgramDto[]>('/programs')
  return data
}

export async function getProgramDetail(id: number): Promise<ProgramDetailDto> {
  const { data } = await apiClient.get<ProgramDetailDto>(`/programs/${id}`)
  return data
}

export async function createProgram(payload: CreateProgramPayload): Promise<ProgramDto> {
  const { data } = await apiClient.post<ProgramDto>('/programs', payload)
  return data
}

export async function updateProgram(id: number, payload: UpdateProgramPayload): Promise<ProgramDto> {
  const { data } = await apiClient.put<ProgramDto>(`/programs/${id}`, payload)
  return data
}

export async function deleteProgram(id: number): Promise<void> {
  await apiClient.delete(`/programs/${id}`)
}

export async function assignUserToProgram(programId: number, userId: string): Promise<void> {
  await apiClient.post(`/programs/${programId}/users`, { userId })
}

export async function removeUserFromProgram(programId: number, userId: string): Promise<void> {
  await apiClient.delete(`/programs/${programId}/users/${userId}`)
}

export async function getProgramEligibleUsers(programId: number): Promise<EligibleUserDto[]> {
  const { data } = await apiClient.get<EligibleUserDto[]>(`/programs/${programId}/eligible-users`)
  return data
}
