import apiClient from './client'

export interface SupplierRefDto {
  id: number
  name: string
}

export interface VendorListDto {
  id: number
  name: string
  description: string | null
  isActive: boolean
  supplier: SupplierRefDto | null
}

export interface VendorDetailDto {
  id: number
  name: string
  description: string | null
  isActive: boolean
  supplier: SupplierRefDto | null
}

export interface CreateVendorPayload {
  name: string
  description?: string
  supplierId?: number | null
  isActive?: boolean
}

export interface UpdateVendorPayload {
  name?: string
  description?: string
  supplierId?: number | null
  isActive?: boolean
}

export interface ImportVendorSpec {
  name: string
  description?: string
  supplierName?: string
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

export async function getVendors(): Promise<VendorListDto[]> {
  const { data } = await apiClient.get<VendorListDto[]>('/vendors')
  return data
}

export async function getVendor(id: number): Promise<VendorDetailDto> {
  const { data } = await apiClient.get<VendorDetailDto>(`/vendors/${id}`)
  return data
}

export async function createVendor(payload: CreateVendorPayload): Promise<VendorDetailDto> {
  const { data } = await apiClient.post<VendorDetailDto>('/vendors', payload)
  return data
}

export async function updateVendor(id: number, payload: UpdateVendorPayload): Promise<VendorDetailDto> {
  const { data } = await apiClient.put<VendorDetailDto>(`/vendors/${id}`, payload)
  return data
}

export async function deleteVendor(id: number): Promise<void> {
  await apiClient.delete(`/vendors/${id}`)
}

export async function importVendors(specs: ImportVendorSpec[]): Promise<ImportSummaryDto> {
  const { data } = await apiClient.post<ImportSummaryDto>('/vendors/import', specs)
  return data
}

export function exportVendorsUrl(): string {
  return '/api/vendors/export'
}
