import apiClient from './client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PackagingTypeDto {
  id: number
  name: string
  hasCount: boolean
  hasStyle: boolean
  sortOrder: number
  isActive: boolean
}

export interface CreatePackagingTypePayload {
  name: string
  hasCount: boolean
  hasStyle: boolean
  sortOrder?: number
}

export interface UpdatePackagingTypePayload {
  name?: string
  hasCount?: boolean
  hasStyle?: boolean
  sortOrder?: number
  isActive?: boolean
}

// ── Volumes ───────────────────────────────────────────────────────────────────

export interface PackagingVolumeDto {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
}

export interface CreatePackagingVolumePayload {
  name: string
  sortOrder?: number
}

export interface UpdatePackagingVolumePayload {
  name?: string
  sortOrder?: number
  isActive?: boolean
}

// ── Styles ────────────────────────────────────────────────────────────────────

export interface PackagingStyleDto {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
}

export interface CreatePackagingStylePayload {
  name: string
  sortOrder?: number
}

export interface UpdatePackagingStylePayload {
  name?: string
  sortOrder?: number
  isActive?: boolean
}

// ── Entries ───────────────────────────────────────────────────────────────────

export interface PackagingEntryDto {
  id: number
  packagingTypeId: number
  typeName: string
  typeHasCount: boolean
  typeHasStyle: boolean
  count: string | null
  packagingVolumeId: number
  volumeName: string
  packagingStyleId: number | null
  styleName: string | null
  sortOrder: number
  isActive: boolean
  label: string
}

export interface CreatePackagingEntryPayload {
  packagingTypeId: number
  count?: string
  packagingVolumeId: number
  packagingStyleId?: number
  sortOrder?: number
}

export interface UpdatePackagingEntryPayload {
  packagingTypeId?: number
  count?: string
  packagingVolumeId?: number
  packagingStyleId?: number
  sortOrder?: number
  isActive?: boolean
  clearCount?: boolean
  clearStyle?: boolean
}

// ── API functions ─────────────────────────────────────────────────────────────

export const getPackagingTypes = () =>
  apiClient.get<PackagingTypeDto[]>('/packaging/types').then(r => r.data)
export const createPackagingType = (p: CreatePackagingTypePayload) =>
  apiClient.post<PackagingTypeDto>('/packaging/types', p).then(r => r.data)
export const updatePackagingType = (id: number, p: UpdatePackagingTypePayload) =>
  apiClient.put<PackagingTypeDto>(`/packaging/types/${id}`, p).then(r => r.data)
export const deletePackagingType = (id: number) =>
  apiClient.delete(`/packaging/types/${id}`)

export const getPackagingVolumes = () =>
  apiClient.get<PackagingVolumeDto[]>('/packaging/volumes').then(r => r.data)
export const createPackagingVolume = (p: CreatePackagingVolumePayload) =>
  apiClient.post<PackagingVolumeDto>('/packaging/volumes', p).then(r => r.data)
export const updatePackagingVolume = (id: number, p: UpdatePackagingVolumePayload) =>
  apiClient.put<PackagingVolumeDto>(`/packaging/volumes/${id}`, p).then(r => r.data)
export const deletePackagingVolume = (id: number) =>
  apiClient.delete(`/packaging/volumes/${id}`)

export const getPackagingStyles = () =>
  apiClient.get<PackagingStyleDto[]>('/packaging/styles').then(r => r.data)
export const createPackagingStyle = (p: CreatePackagingStylePayload) =>
  apiClient.post<PackagingStyleDto>('/packaging/styles', p).then(r => r.data)
export const updatePackagingStyle = (id: number, p: UpdatePackagingStylePayload) =>
  apiClient.put<PackagingStyleDto>(`/packaging/styles/${id}`, p).then(r => r.data)
export const deletePackagingStyle = (id: number) =>
  apiClient.delete(`/packaging/styles/${id}`)

export const getPackagingEntries = () =>
  apiClient.get<PackagingEntryDto[]>('/packaging/entries').then(r => r.data)
export const createPackagingEntry = (p: CreatePackagingEntryPayload) =>
  apiClient.post<PackagingEntryDto>('/packaging/entries', p).then(r => r.data)
export const updatePackagingEntry = (id: number, p: UpdatePackagingEntryPayload) =>
  apiClient.put<PackagingEntryDto>(`/packaging/entries/${id}`, p).then(r => r.data)
export const deletePackagingEntry = (id: number) =>
  apiClient.delete(`/packaging/entries/${id}`)

export interface ImportResult { created: number; skipped: number; errors: string[] }
export const importPackagingEntries = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return apiClient.post<ImportResult>('/packaging/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const getPackagingImportTemplateUrl = () => '/api/packaging/import/template'
