import apiClient from './client'

export interface MeetingCatalogEntryDto {
  id: number
  title: string
  meetingType: string | null
  purpose: string | null
  goals: string | null
  defaultDurationMinutes: number | null
  description: string | null
  sortOrder: number
  isActive: boolean
}

export interface CreateMeetingCatalogPayload {
  title: string
  meetingType?: string
  purpose?: string
  goals?: string
  defaultDurationMinutes?: number
  description?: string
  sortOrder?: number
}

export interface UpdateMeetingCatalogPayload {
  title?: string
  meetingType?: string
  purpose?: string
  goals?: string
  defaultDurationMinutes?: number | null
  description?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getMeetingCatalog(): Promise<MeetingCatalogEntryDto[]> {
  const { data } = await apiClient.get<MeetingCatalogEntryDto[]>('/meeting-catalog')
  return data
}

export async function getMeetingCatalogEntry(id: number): Promise<MeetingCatalogEntryDto> {
  const { data } = await apiClient.get<MeetingCatalogEntryDto>(`/meeting-catalog/${id}`)
  return data
}

export async function createMeetingCatalogEntry(payload: CreateMeetingCatalogPayload): Promise<MeetingCatalogEntryDto> {
  const { data } = await apiClient.post<MeetingCatalogEntryDto>('/meeting-catalog', payload)
  return data
}

export async function updateMeetingCatalogEntry(id: number, payload: UpdateMeetingCatalogPayload): Promise<MeetingCatalogEntryDto> {
  const { data } = await apiClient.put<MeetingCatalogEntryDto>(`/meeting-catalog/${id}`, payload)
  return data
}

export async function deleteMeetingCatalogEntry(id: number): Promise<void> {
  await apiClient.delete(`/meeting-catalog/${id}`)
}
