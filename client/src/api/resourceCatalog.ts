import apiClient from './client'

export interface ResourceCatalogEntryDto {
  id: number
  title: string
  resourceType: string | null
  resourceUrl: string | null
  resourceLabel: string | null
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface CreateResourceCatalogPayload {
  title: string
  resourceType?: string
  resourceUrl?: string
  resourceLabel?: string
  description?: string
  sortOrder?: number
}

export interface UpdateResourceCatalogPayload {
  title?: string
  resourceType?: string
  resourceUrl?: string
  resourceLabel?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getResourceCatalog(): Promise<ResourceCatalogEntryDto[]> {
  const { data } = await apiClient.get<ResourceCatalogEntryDto[]>('/resource-catalog')
  return data
}

export async function getResourceCatalogEntry(id: number): Promise<ResourceCatalogEntryDto> {
  const { data } = await apiClient.get<ResourceCatalogEntryDto>(`/resource-catalog/${id}`)
  return data
}

export async function createResourceCatalogEntry(payload: CreateResourceCatalogPayload): Promise<ResourceCatalogEntryDto> {
  const { data } = await apiClient.post<ResourceCatalogEntryDto>('/resource-catalog', payload)
  return data
}

export async function updateResourceCatalogEntry(id: number, payload: UpdateResourceCatalogPayload): Promise<ResourceCatalogEntryDto> {
  const { data } = await apiClient.put<ResourceCatalogEntryDto>(`/resource-catalog/${id}`, payload)
  return data
}

export async function deleteResourceCatalogEntry(id: number): Promise<void> {
  await apiClient.delete(`/resource-catalog/${id}`)
}
