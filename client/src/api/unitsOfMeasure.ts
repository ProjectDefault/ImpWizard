import apiClient from './client'

export interface UomDto {
  id: number
  name: string
  abbreviation: string | null
  unitCategory: string
  system: string
  isBaseUnit: boolean
  toBaseMultiplier: number
  sortOrder: number
  isActive: boolean
}

export interface UomConversionDto {
  toUnitId: number
  toUnitName: string
  toUnitAbbreviation: string | null
  factor: number
}

export interface CreateUomPayload {
  name: string
  abbreviation?: string
  unitCategory: string
  system: string
  isBaseUnit: boolean
  toBaseMultiplier: number
  sortOrder: number
}

export interface UpdateUomPayload {
  name?: string
  abbreviation?: string
  unitCategory?: string
  system?: string
  isBaseUnit?: boolean
  toBaseMultiplier?: number
  sortOrder?: number
  isActive?: boolean
}

export async function getUnitsOfMeasure(): Promise<UomDto[]> {
  const { data } = await apiClient.get<UomDto[]>('/units-of-measure')
  return data
}

export async function getUnitOfMeasure(id: number): Promise<UomDto> {
  const { data } = await apiClient.get<UomDto>(`/units-of-measure/${id}`)
  return data
}

export async function getUomConversions(id: number): Promise<UomConversionDto[]> {
  const { data } = await apiClient.get<UomConversionDto[]>(`/units-of-measure/${id}/conversions`)
  return data
}

export async function createUom(payload: CreateUomPayload): Promise<UomDto> {
  const { data } = await apiClient.post<UomDto>('/units-of-measure', payload)
  return data
}

export async function updateUom(id: number, payload: UpdateUomPayload): Promise<UomDto> {
  const { data } = await apiClient.put<UomDto>(`/units-of-measure/${id}`, payload)
  return data
}

export async function deleteUom(id: number): Promise<void> {
  await apiClient.delete(`/units-of-measure/${id}`)
}
