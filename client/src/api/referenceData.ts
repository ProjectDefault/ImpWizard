import apiClient from './client'

export interface CategoryRefDto {
  id: number
  name: string
}

export interface ProductTypeRefDto {
  id: number
  name: string
}

export interface ProgramRefDto {
  id: number
  name: string
  color: string | null
}

export interface DataItemDto {
  id: number
  label: string
  sortOrder: number
  isActive: boolean
  productTypes: ProductTypeRefDto[]
}

export interface DataSetListDto {
  id: number
  name: string
  description: string | null
  isAdminOnly: boolean
  sortOrder: number
  itemCount: number
  category: CategoryRefDto | null
  programs: ProgramRefDto[]
}

export interface DataSetDetailDto {
  id: number
  name: string
  description: string | null
  isAdminOnly: boolean
  sortOrder: number
  category: CategoryRefDto | null
  programs: ProgramRefDto[]
  productTypes: ProductTypeRefDto[]
  items: DataItemDto[]
}

export interface CreateDataSetPayload {
  name: string
  description?: string
  isAdminOnly: boolean
  sortOrder: number
  programIds?: number[]
}

export interface UpdateDataSetPayload {
  name?: string
  description?: string
  isAdminOnly?: boolean
  sortOrder?: number
}

export interface CreateItemPayload {
  label: string
  sortOrder: number
}

export interface UpdateItemPayload {
  label?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getDataSets(): Promise<DataSetListDto[]> {
  const { data } = await apiClient.get<DataSetListDto[]>('/reference-data')
  return data
}

export async function getDataSet(id: number): Promise<DataSetDetailDto> {
  const { data } = await apiClient.get<DataSetDetailDto>(`/reference-data/${id}`)
  return data
}

export async function createDataSet(payload: CreateDataSetPayload): Promise<DataSetDetailDto> {
  const { data } = await apiClient.post<DataSetDetailDto>('/reference-data', payload)
  return data
}

export async function updateDataSet(id: number, payload: UpdateDataSetPayload): Promise<DataSetDetailDto> {
  const { data } = await apiClient.put<DataSetDetailDto>(`/reference-data/${id}`, payload)
  return data
}

export async function deleteDataSet(id: number): Promise<void> {
  await apiClient.delete(`/reference-data/${id}`)
}

export async function addItem(dataSetId: number, payload: CreateItemPayload): Promise<DataItemDto> {
  const { data } = await apiClient.post<DataItemDto>(`/reference-data/${dataSetId}/items`, payload)
  return data
}

export async function updateItem(dataSetId: number, itemId: number, payload: UpdateItemPayload): Promise<DataItemDto> {
  const { data } = await apiClient.put<DataItemDto>(`/reference-data/${dataSetId}/items/${itemId}`, payload)
  return data
}

export async function deleteItem(dataSetId: number, itemId: number): Promise<void> {
  await apiClient.delete(`/reference-data/${dataSetId}/items/${itemId}`)
}

export async function reorderItems(dataSetId: number, itemIds: number[]): Promise<DataSetDetailDto> {
  const { data } = await apiClient.put<DataSetDetailDto>(`/reference-data/${dataSetId}/items/reorder`, itemIds)
  return data
}

export async function setDataSetCategory(dataSetId: number, categoryId: number | null): Promise<DataSetDetailDto> {
  const { data } = await apiClient.put<DataSetDetailDto>(`/reference-data/${dataSetId}/category`, { categoryId })
  return data
}

export async function setDataSetPrograms(dataSetId: number, programIds: number[]): Promise<DataSetDetailDto> {
  const { data } = await apiClient.put<DataSetDetailDto>(`/reference-data/${dataSetId}/programs`, programIds)
  return data
}

export async function setDataSetProductTypes(dataSetId: number, productTypeIds: number[]): Promise<DataSetDetailDto> {
  const { data } = await apiClient.put<DataSetDetailDto>(`/reference-data/${dataSetId}/product-types`, productTypeIds)
  return data
}

export async function setItemProductTypes(dataSetId: number, itemId: number, productTypeIds: number[]): Promise<DataItemDto> {
  const { data } = await apiClient.put<DataItemDto>(`/reference-data/${dataSetId}/items/${itemId}/product-types`, productTypeIds)
  return data
}

// ── Import ────────────────────────────────────────────────────────────────────

export interface ImportItemSpec {
  label: string
  sortOrder?: number
  productTypes?: string[]
}

export interface ImportDataSetSpec {
  name: string
  description?: string
  isAdminOnly?: boolean
  sortOrder?: number
  /** Category name. null/omitted = don't change. "" = clear. */
  category?: string
  /** ProductType names. null/omitted = don't change. [] = clear all. */
  productTypes?: string[]
  items?: ImportItemSpec[]
}

export interface ImportResultDto {
  name: string
  action: 'created' | 'updated' | 'skipped'
  itemsCreated: number
  itemsUpdated: number
  warnings: string[]
}

export interface ImportSummaryDto {
  results: ImportResultDto[]
}

export async function importDataSets(specs: ImportDataSetSpec[]): Promise<ImportSummaryDto> {
  const { data } = await apiClient.post<ImportSummaryDto>('/reference-data/import', specs)
  return data
}
