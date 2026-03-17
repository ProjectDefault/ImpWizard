import apiClient from './client'

export interface ProductTypeListDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  dataSetCount: number
  itemCount: number
}

export interface ItemAssignmentDto {
  itemId: number
  label: string
  dataSetId: number
  dataSetName: string
}

export interface ProductTypeDetailDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  dataSets: { id: number; name: string }[]
  items: ItemAssignmentDto[]
}

export interface CreateProductTypePayload {
  name: string
  description?: string
  sortOrder: number
}

export interface UpdateProductTypePayload {
  name?: string
  description?: string
  sortOrder?: number
}

export async function getProductTypes(): Promise<ProductTypeListDto[]> {
  const { data } = await apiClient.get<ProductTypeListDto[]>('/product-types')
  return data
}

export async function getProductType(id: number): Promise<ProductTypeDetailDto> {
  const { data } = await apiClient.get<ProductTypeDetailDto>(`/product-types/${id}`)
  return data
}

export async function createProductType(payload: CreateProductTypePayload): Promise<ProductTypeDetailDto> {
  const { data } = await apiClient.post<ProductTypeDetailDto>('/product-types', payload)
  return data
}

export async function updateProductType(id: number, payload: UpdateProductTypePayload): Promise<ProductTypeDetailDto> {
  const { data } = await apiClient.put<ProductTypeDetailDto>(`/product-types/${id}`, payload)
  return data
}

export async function deleteProductType(id: number): Promise<void> {
  await apiClient.delete(`/product-types/${id}`)
}
