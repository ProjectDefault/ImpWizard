import apiClient from './client'

export interface ImplementationTypeDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  programId: number | null
}

export interface CreateImplementationTypePayload {
  name: string
  description?: string
  sortOrder: number
  programId?: number
}

export interface UpdateImplementationTypePayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
  programId?: number | null
}

export async function getImplementationTypes(): Promise<ImplementationTypeDto[]> {
  const { data } = await apiClient.get<ImplementationTypeDto[]>('/implementation-types')
  return data
}

export async function getImplementationType(id: number): Promise<ImplementationTypeDto> {
  const { data } = await apiClient.get<ImplementationTypeDto>(`/implementation-types/${id}`)
  return data
}

export async function createImplementationType(payload: CreateImplementationTypePayload): Promise<ImplementationTypeDto> {
  const { data } = await apiClient.post<ImplementationTypeDto>('/implementation-types', payload)
  return data
}

export async function updateImplementationType(id: number, payload: UpdateImplementationTypePayload): Promise<ImplementationTypeDto> {
  const { data } = await apiClient.put<ImplementationTypeDto>(`/implementation-types/${id}`, payload)
  return data
}

export async function deleteImplementationType(id: number): Promise<void> {
  await apiClient.delete(`/implementation-types/${id}`)
}
