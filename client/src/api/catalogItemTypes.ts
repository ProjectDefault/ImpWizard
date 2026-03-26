import apiClient from './client'

export interface CatalogItemSubTypeDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  catalogItemTypeId: number
}

export interface CatalogItemTypeFieldDto {
  id: number
  fieldName: string
  fieldLabel: string
  fieldType: 'Text' | 'Number'
  isRequired: boolean
  isActive: boolean
  sortOrder: number
  catalogItemTypeId: number
}

export interface CatalogItemTypeDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  subTypes: CatalogItemSubTypeDto[]
  fields: CatalogItemTypeFieldDto[]
}

export interface CreateCatalogItemTypePayload {
  name: string
  description?: string
  sortOrder?: number
}

export interface UpdateCatalogItemTypePayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface CreateCatalogItemSubTypePayload {
  name: string
  description?: string
  sortOrder?: number
}

export interface UpdateCatalogItemSubTypePayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getCatalogItemTypes(): Promise<CatalogItemTypeDto[]> {
  const { data } = await apiClient.get<CatalogItemTypeDto[]>('/catalog-item-types')
  return data
}

export async function createCatalogItemType(payload: CreateCatalogItemTypePayload): Promise<CatalogItemTypeDto> {
  const { data } = await apiClient.post<CatalogItemTypeDto>('/catalog-item-types', payload)
  return data
}

export async function updateCatalogItemType(id: number, payload: UpdateCatalogItemTypePayload): Promise<CatalogItemTypeDto> {
  const { data } = await apiClient.put<CatalogItemTypeDto>(`/catalog-item-types/${id}`, payload)
  return data
}

export async function deleteCatalogItemType(id: number): Promise<void> {
  await apiClient.delete(`/catalog-item-types/${id}`)
}

export async function createCatalogItemSubType(typeId: number, payload: CreateCatalogItemSubTypePayload): Promise<CatalogItemSubTypeDto> {
  const { data } = await apiClient.post<CatalogItemSubTypeDto>(`/catalog-item-types/${typeId}/subtypes`, payload)
  return data
}

export async function updateCatalogItemSubType(typeId: number, subId: number, payload: UpdateCatalogItemSubTypePayload): Promise<CatalogItemSubTypeDto> {
  const { data } = await apiClient.put<CatalogItemSubTypeDto>(`/catalog-item-types/${typeId}/subtypes/${subId}`, payload)
  return data
}

export async function deleteCatalogItemSubType(typeId: number, subId: number): Promise<void> {
  await apiClient.delete(`/catalog-item-types/${typeId}/subtypes/${subId}`)
}

export interface CreateCatalogItemTypeFieldPayload {
  fieldName: string
  fieldLabel: string
  fieldType: 'Text' | 'Number'
  isRequired?: boolean
  sortOrder?: number
}

export interface UpdateCatalogItemTypeFieldPayload {
  fieldName?: string
  fieldLabel?: string
  fieldType?: 'Text' | 'Number'
  isRequired?: boolean
  isActive?: boolean
  sortOrder?: number
}

export async function createCatalogItemTypeField(typeId: number, payload: CreateCatalogItemTypeFieldPayload): Promise<CatalogItemTypeFieldDto> {
  const { data } = await apiClient.post<CatalogItemTypeFieldDto>(`/catalog-item-types/${typeId}/fields`, payload)
  return data
}

export async function updateCatalogItemTypeField(typeId: number, fieldId: number, payload: UpdateCatalogItemTypeFieldPayload): Promise<CatalogItemTypeFieldDto> {
  const { data } = await apiClient.put<CatalogItemTypeFieldDto>(`/catalog-item-types/${typeId}/fields/${fieldId}`, payload)
  return data
}
