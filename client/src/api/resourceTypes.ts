import apiClient from './client'

export interface ResourceTypeDto {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
}

export interface CreateResourceTypePayload {
  name: string
  sortOrder?: number
}

export interface UpdateResourceTypePayload {
  name?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getResourceTypes(): Promise<ResourceTypeDto[]> {
  const { data } = await apiClient.get<ResourceTypeDto[]>('/resource-types')
  return data
}

export async function getResourceType(id: number): Promise<ResourceTypeDto> {
  const { data } = await apiClient.get<ResourceTypeDto>(`/resource-types/${id}`)
  return data
}

export async function createResourceType(payload: CreateResourceTypePayload): Promise<ResourceTypeDto> {
  const { data } = await apiClient.post<ResourceTypeDto>('/resource-types', payload)
  return data
}

export async function updateResourceType(id: number, payload: UpdateResourceTypePayload): Promise<ResourceTypeDto> {
  const { data } = await apiClient.put<ResourceTypeDto>(`/resource-types/${id}`, payload)
  return data
}

export async function deleteResourceType(id: number): Promise<void> {
  await apiClient.delete(`/resource-types/${id}`)
}
