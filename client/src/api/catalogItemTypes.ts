import apiClient from './client'

export interface SubTypeDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface TypeFieldDto {
  id: number
  fieldName: string
  fieldLabel: string
  fieldType: 'Text' | 'Number' | 'Boolean'
  isRequired: boolean
  sortOrder: number
}

export interface CatalogItemTypeListDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  subTypeCount: number
  fieldCount: number
}

export interface CatalogItemTypeDetailDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
  subTypes: SubTypeDto[]
  fields: TypeFieldDto[]
}

export interface CreateTypePayload {
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateTypePayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface CreateSubTypePayload {
  name: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateSubTypePayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export interface CreateTypeFieldPayload {
  fieldName: string
  fieldLabel: string
  fieldType: 'Text' | 'Number' | 'Boolean'
  isRequired?: boolean
  sortOrder?: number
}

export interface UpdateTypeFieldPayload {
  fieldName?: string
  fieldLabel?: string
  fieldType?: 'Text' | 'Number' | 'Boolean'
  isRequired?: boolean
  sortOrder?: number
}

export async function getCatalogItemTypes(): Promise<CatalogItemTypeListDto[]> {
  const { data } = await apiClient.get<CatalogItemTypeListDto[]>('/catalog-item-types')
  return data
}

export async function getCatalogItemType(id: number): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.get<CatalogItemTypeDetailDto>(`/catalog-item-types/${id}`)
  return data
}

export async function createCatalogItemType(payload: CreateTypePayload): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.post<CatalogItemTypeDetailDto>('/catalog-item-types', payload)
  return data
}

export async function updateCatalogItemType(id: number, payload: UpdateTypePayload): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.put<CatalogItemTypeDetailDto>(`/catalog-item-types/${id}`, payload)
  return data
}

export async function deleteCatalogItemType(id: number): Promise<void> {
  await apiClient.delete(`/catalog-item-types/${id}`)
}

// SubTypes
export async function addSubType(typeId: number, payload: CreateSubTypePayload): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.post<CatalogItemTypeDetailDto>(`/catalog-item-types/${typeId}/subtypes`, payload)
  return data
}

export async function updateSubType(typeId: number, subId: number, payload: UpdateSubTypePayload): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.put<CatalogItemTypeDetailDto>(`/catalog-item-types/${typeId}/subtypes/${subId}`, payload)
  return data
}

export async function deleteSubType(typeId: number, subId: number): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.delete<CatalogItemTypeDetailDto>(`/catalog-item-types/${typeId}/subtypes/${subId}`)
  return data
}

// Custom Fields
export async function addTypeField(typeId: number, payload: CreateTypeFieldPayload): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.post<CatalogItemTypeDetailDto>(`/catalog-item-types/${typeId}/fields`, payload)
  return data
}

export async function updateTypeField(typeId: number, fieldId: number, payload: UpdateTypeFieldPayload): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.put<CatalogItemTypeDetailDto>(`/catalog-item-types/${typeId}/fields/${fieldId}`, payload)
  return data
}

export async function deleteTypeField(typeId: number, fieldId: number): Promise<CatalogItemTypeDetailDto> {
  const { data } = await apiClient.delete<CatalogItemTypeDetailDto>(`/catalog-item-types/${typeId}/fields/${fieldId}`)
  return data
}
