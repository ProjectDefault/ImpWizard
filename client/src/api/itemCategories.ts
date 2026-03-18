import apiClient from './client'

export interface ItemCategoryDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface CreateItemCategoryPayload {
  name: string
  description?: string
  sortOrder?: number
}

export interface UpdateItemCategoryPayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getItemCategories(): Promise<ItemCategoryDto[]> {
  const { data } = await apiClient.get<ItemCategoryDto[]>('/item-categories')
  return data
}

export async function createItemCategory(payload: CreateItemCategoryPayload): Promise<ItemCategoryDto> {
  const { data } = await apiClient.post<ItemCategoryDto>('/item-categories', payload)
  return data
}

export async function updateItemCategory(id: number, payload: UpdateItemCategoryPayload): Promise<ItemCategoryDto> {
  const { data } = await apiClient.put<ItemCategoryDto>(`/item-categories/${id}`, payload)
  return data
}

export async function deleteItemCategory(id: number): Promise<void> {
  await apiClient.delete(`/item-categories/${id}`)
}
