import apiClient from './client'

export interface ProductTypeRefDto {
  id: number
  name: string
}

export interface FieldValueDto {
  fieldId: number
  fieldName: string
  fieldLabel: string
  fieldType: 'Text' | 'Number' | 'Boolean'
  value: string
}

export interface CatalogItemListDto {
  id: number
  itemName: string
  isActive: boolean
  sortOrder: number
  itemType: string | null
  itemSubType: string | null
  supplier: string | null
  vendor: string | null
  vendorItemNumber: string | null
  purchaseUomDescription: string | null
  purchaseAmountPerUom: number | null
  purchaseUomName: string | null
  purchaseUomAbbreviation: string | null
  uomType: string | null
  programName: string | null
  programColor: string | null
  productTypes: string[]
}

export interface CatalogItemDetailDto {
  id: number
  itemName: string
  isActive: boolean
  sortOrder: number
  programId: number | null
  programName: string | null
  programColor: string | null
  catalogItemTypeId: number | null
  catalogItemTypeName: string | null
  catalogItemSubTypeId: number | null
  catalogItemSubTypeName: string | null
  supplierId: number | null
  supplierName: string | null
  vendorId: number | null
  vendorName: string | null
  vendorItemNumber: string | null
  purchaseUomDescription: string | null
  purchaseAmountPerUom: number | null
  purchaseUomId: number | null
  purchaseUomName: string | null
  purchaseUomAbbreviation: string | null
  uomType: string | null
  productTypes: ProductTypeRefDto[]
  fieldValues: FieldValueDto[]
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CatalogFilters {
  search?: string
  programId?: number
  typeId?: number
  subTypeId?: number
  supplierId?: number
  vendorId?: number
  productTypeId?: number
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface CreateCatalogItemPayload {
  itemName: string
  programId?: number | null
  catalogItemTypeId?: number | null
  catalogItemSubTypeId?: number | null
  supplierId?: number | null
  vendorId?: number | null
  vendorItemNumber?: string
  purchaseUomDescription?: string
  purchaseAmountPerUom?: number | null
  purchaseUomId?: number | null
  sortOrder?: number
}

export interface UpdateCatalogItemPayload {
  itemName?: string
  isActive?: boolean
  programId?: number | null
  catalogItemTypeId?: number | null
  catalogItemSubTypeId?: number | null
  supplierId?: number | null
  vendorId?: number | null
  vendorItemNumber?: string
  purchaseUomDescription?: string
  purchaseAmountPerUom?: number | null
  purchaseUomId?: number | null
  sortOrder?: number
}

export interface BulkUpdatePayload {
  itemIds: number[]
  programId?: number | null
  catalogItemTypeId?: number | null
  catalogItemSubTypeId?: number | null
  supplierId?: number | null
  vendorId?: number | null
  isActive?: boolean
  productTypeIds?: number[]
}

export interface FieldValueUpsert {
  fieldId: number
  value: string
}

export interface ImportItemSpec {
  itemName: string
  programName?: string
  typeName?: string
  subTypeName?: string
  supplierName?: string
  vendorName?: string
  vendorItemNumber?: string
  purchaseUomDescription?: string
  purchaseAmountPerUom?: number
  purchaseUomName?: string
  isActive?: boolean
  sortOrder?: number
  productTypeNames?: string[]
  fieldValues?: FieldValueUpsert[]
}

export interface ImportResultDto {
  itemName: string
  action: string
  warnings: string[]
}

export interface ImportSummaryDto {
  results: ImportResultDto[]
}

export async function getCatalogItems(filters: CatalogFilters = {}): Promise<PagedResult<CatalogItemListDto>> {
  const params: Record<string, string> = {}
  if (filters.search) params.search = filters.search
  if (filters.programId != null) params.programId = String(filters.programId)
  if (filters.typeId != null) params.typeId = String(filters.typeId)
  if (filters.subTypeId != null) params.subTypeId = String(filters.subTypeId)
  if (filters.supplierId != null) params.supplierId = String(filters.supplierId)
  if (filters.vendorId != null) params.vendorId = String(filters.vendorId)
  if (filters.productTypeId != null) params.productTypeId = String(filters.productTypeId)
  if (filters.isActive != null) params.isActive = String(filters.isActive)
  if (filters.page != null) params.page = String(filters.page)
  if (filters.pageSize != null) params.pageSize = String(filters.pageSize)

  const { data } = await apiClient.get<PagedResult<CatalogItemListDto>>('/catalog', { params })
  return data
}

export async function getCatalogItem(id: number): Promise<CatalogItemDetailDto> {
  const { data } = await apiClient.get<CatalogItemDetailDto>(`/catalog/${id}`)
  return data
}

export async function createCatalogItem(payload: CreateCatalogItemPayload): Promise<CatalogItemDetailDto> {
  const { data } = await apiClient.post<CatalogItemDetailDto>('/catalog', payload)
  return data
}

export async function updateCatalogItem(id: number, payload: UpdateCatalogItemPayload): Promise<CatalogItemDetailDto> {
  const { data } = await apiClient.put<CatalogItemDetailDto>(`/catalog/${id}`, payload)
  return data
}

export async function deleteCatalogItem(id: number): Promise<void> {
  await apiClient.delete(`/catalog/${id}`)
}

export async function setCatalogItemProductTypes(id: number, productTypeIds: number[]): Promise<CatalogItemDetailDto> {
  const { data } = await apiClient.put<CatalogItemDetailDto>(`/catalog/${id}/product-types`, productTypeIds)
  return data
}

export async function setCatalogItemFieldValues(id: number, values: FieldValueUpsert[]): Promise<CatalogItemDetailDto> {
  const { data } = await apiClient.put<CatalogItemDetailDto>(`/catalog/${id}/field-values`, { values })
  return data
}

export async function bulkUpdateCatalogItems(payload: BulkUpdatePayload): Promise<{ updated: number }> {
  const { data } = await apiClient.patch<{ updated: number }>('/catalog/bulk', payload)
  return data
}

export async function importCatalogItems(specs: ImportItemSpec[]): Promise<ImportSummaryDto> {
  const { data } = await apiClient.post<ImportSummaryDto>('/catalog/import', specs)
  return data
}

export function exportCatalogUrl(filters: Omit<CatalogFilters, 'page' | 'pageSize'> = {}): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.programId != null) params.set('programId', String(filters.programId))
  if (filters.typeId != null) params.set('typeId', String(filters.typeId))
  if (filters.supplierId != null) params.set('supplierId', String(filters.supplierId))
  if (filters.vendorId != null) params.set('vendorId', String(filters.vendorId))
  if (filters.isActive != null) params.set('isActive', String(filters.isActive))
  const qs = params.toString()
  return `/api/catalog/export${qs ? `?${qs}` : ''}`
}
