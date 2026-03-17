import apiClient from './client'

export interface ProgramRefDto {
  id: number
  name: string
  color: string | null
}

export interface CategoryListDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  dataSetCount: number
  program: ProgramRefDto | null
}

export interface DataSetSummaryDto {
  id: number
  name: string
}

export interface CategoryDetailDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  program: ProgramRefDto | null
  dataSets: DataSetSummaryDto[]
}

export interface CreateCategoryPayload {
  name: string
  description?: string
  sortOrder: number
  programId?: number
}

export interface UpdateCategoryPayload {
  name?: string
  description?: string
  sortOrder?: number
  programId?: number | null
}

export async function getCategories(): Promise<CategoryListDto[]> {
  const { data } = await apiClient.get<CategoryListDto[]>('/categories')
  return data
}

export async function getCategory(id: number): Promise<CategoryDetailDto> {
  const { data } = await apiClient.get<CategoryDetailDto>(`/categories/${id}`)
  return data
}

export async function createCategory(payload: CreateCategoryPayload): Promise<CategoryDetailDto> {
  const { data } = await apiClient.post<CategoryDetailDto>('/categories', payload)
  return data
}

export async function updateCategory(id: number, payload: UpdateCategoryPayload): Promise<CategoryDetailDto> {
  const { data } = await apiClient.put<CategoryDetailDto>(`/categories/${id}`, payload)
  return data
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}`)
}
