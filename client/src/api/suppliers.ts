import apiClient from './client'

export interface VendorRefDto {
  id: number
  name: string
  isActive: boolean
}

export interface SupplierListDto {
  id: number
  name: string
  description: string | null
  isActive: boolean
  vendorCount: number
}

export interface SupplierDetailDto {
  id: number
  name: string
  description: string | null
  isActive: boolean
  vendors: VendorRefDto[]
}

export interface CreateSupplierPayload {
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateSupplierPayload {
  name?: string
  description?: string
  isActive?: boolean
}

export interface ImportSupplierSpec {
  name: string
  description?: string
  isActive?: boolean
}

export interface ImportResultDto {
  name: string
  action: string
  warning?: string
}

export interface ImportSummaryDto {
  results: ImportResultDto[]
}

export async function getSuppliers(): Promise<SupplierListDto[]> {
  const { data } = await apiClient.get<SupplierListDto[]>('/suppliers')
  return data
}

export async function getSupplier(id: number): Promise<SupplierDetailDto> {
  const { data } = await apiClient.get<SupplierDetailDto>(`/suppliers/${id}`)
  return data
}

export async function createSupplier(payload: CreateSupplierPayload): Promise<SupplierDetailDto> {
  const { data } = await apiClient.post<SupplierDetailDto>('/suppliers', payload)
  return data
}

export async function updateSupplier(id: number, payload: UpdateSupplierPayload): Promise<SupplierDetailDto> {
  const { data } = await apiClient.put<SupplierDetailDto>(`/suppliers/${id}`, payload)
  return data
}

export async function deleteSupplier(id: number): Promise<void> {
  await apiClient.delete(`/suppliers/${id}`)
}

export async function importSuppliers(specs: ImportSupplierSpec[]): Promise<ImportSummaryDto> {
  const { data } = await apiClient.post<ImportSummaryDto>('/suppliers/import', specs)
  return data
}

export function exportSuppliersUrl(): string {
  return '/api/suppliers/export'
}
