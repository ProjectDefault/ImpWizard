import apiClient from './client'

export interface MeetingTypeDto {
  id: number
  name: string
  sortOrder: number
  isActive: boolean
}

export interface CreateMeetingTypePayload {
  name: string
  sortOrder?: number
}

export interface UpdateMeetingTypePayload {
  name?: string
  sortOrder?: number
  isActive?: boolean
}

export async function getMeetingTypes(): Promise<MeetingTypeDto[]> {
  const { data } = await apiClient.get<MeetingTypeDto[]>('/meeting-types')
  return data
}

export async function getMeetingType(id: number): Promise<MeetingTypeDto> {
  const { data } = await apiClient.get<MeetingTypeDto>(`/meeting-types/${id}`)
  return data
}

export async function createMeetingType(payload: CreateMeetingTypePayload): Promise<MeetingTypeDto> {
  const { data } = await apiClient.post<MeetingTypeDto>('/meeting-types', payload)
  return data
}

export async function updateMeetingType(id: number, payload: UpdateMeetingTypePayload): Promise<MeetingTypeDto> {
  const { data } = await apiClient.put<MeetingTypeDto>(`/meeting-types/${id}`, payload)
  return data
}

export async function deleteMeetingType(id: number): Promise<void> {
  await apiClient.delete(`/meeting-types/${id}`)
}
