import apiClient from './client'

export interface JourneyStageCategoryDto {
  id: number
  name: string
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface CreateJourneyStageCategoryPayload {
  name: string
  description?: string
  sortOrder?: number
}

export interface UpdateJourneyStageCategoryPayload {
  name?: string
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getJourneyStageCategories(): Promise<JourneyStageCategoryDto[]> {
  const { data } = await apiClient.get<JourneyStageCategoryDto[]>('/journey-stage-categories')
  return data
}

export async function getJourneyStageCategory(id: number): Promise<JourneyStageCategoryDto> {
  const { data } = await apiClient.get<JourneyStageCategoryDto>(`/journey-stage-categories/${id}`)
  return data
}

export async function createJourneyStageCategory(payload: CreateJourneyStageCategoryPayload): Promise<JourneyStageCategoryDto> {
  const { data } = await apiClient.post<JourneyStageCategoryDto>('/journey-stage-categories', payload)
  return data
}

export async function updateJourneyStageCategory(id: number, payload: UpdateJourneyStageCategoryPayload): Promise<JourneyStageCategoryDto> {
  const { data } = await apiClient.put<JourneyStageCategoryDto>(`/journey-stage-categories/${id}`, payload)
  return data
}

export async function deleteJourneyStageCategory(id: number): Promise<void> {
  await apiClient.delete(`/journey-stage-categories/${id}`)
}
