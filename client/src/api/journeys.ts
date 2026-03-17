import api from './client'

export interface JourneyItemDto {
  id: number
  itemType: 'Meeting' | 'Resource' | 'FormAssignment'
  sortOrder: number
  title: string
  description?: string
  meetingType?: string
  meetingPurpose?: string
  meetingGoals?: string
  defaultDurationMinutes?: number
  resourceType?: string
  resourceUrl?: string
  resourceLabel?: string
  formId?: number
  formName?: string
}

export interface JourneyStageDto {
  id: number
  name: string
  description?: string
  sortOrder: number
  stageCategoryId: number | null
  stageCategoryName: string | null
  color?: string
  icon?: string
  items: JourneyItemDto[]
}

export interface JourneyListDto {
  id: number
  name: string
  description?: string
  isActive: boolean
  programId?: number
  programName?: string
  stageCount: number
  createdAt: string
  updatedAt: string
}

export interface JourneyDetailDto {
  id: number
  name: string
  description?: string
  isActive: boolean
  programId?: number
  programName?: string
  tags?: string
  stages: JourneyStageDto[]
}

export interface CreateJourneyPayload {
  name: string
  description?: string
  programId?: number
  isActive?: boolean
  tags?: string
}

export interface UpdateJourneyPayload {
  name?: string
  description?: string
  programId?: number | null
  isActive?: boolean
  tags?: string
}

export interface CreateStagePayload {
  name: string
  description?: string
  sortOrder?: number
  stageCategoryId?: number | null
  color?: string
  icon?: string
}

export interface UpdateStagePayload {
  name?: string
  description?: string
  sortOrder?: number
  stageCategoryId?: number | null
  color?: string
  icon?: string
}

export interface CreateItemPayload {
  itemType: 'Meeting' | 'Resource' | 'FormAssignment'
  title: string
  description?: string
  sortOrder?: number
  meetingType?: string
  meetingPurpose?: string
  meetingGoals?: string
  defaultDurationMinutes?: number
  resourceType?: string
  resourceUrl?: string
  resourceLabel?: string
  formId?: number
}

export interface UpdateItemPayload {
  title?: string
  description?: string
  sortOrder?: number
  meetingType?: string
  meetingPurpose?: string
  meetingGoals?: string
  defaultDurationMinutes?: number
  resourceType?: string
  resourceUrl?: string
  resourceLabel?: string
  formId?: number
}

// Journey CRUD
export const getJourneys = (): Promise<JourneyListDto[]> =>
  api.get('/journeys').then(r => r.data)

export const getJourney = (id: number): Promise<JourneyDetailDto> =>
  api.get(`/journeys/${id}`).then(r => r.data)

export const createJourney = (payload: CreateJourneyPayload): Promise<JourneyDetailDto> =>
  api.post('/journeys', payload).then(r => r.data)

export const updateJourney = (id: number, payload: UpdateJourneyPayload): Promise<JourneyDetailDto> =>
  api.put(`/journeys/${id}`, payload).then(r => r.data)

export const deleteJourney = (id: number): Promise<void> =>
  api.delete(`/journeys/${id}`).then(() => undefined)

// Stage CRUD
export const addStage = (journeyId: number, payload: CreateStagePayload): Promise<JourneyDetailDto> =>
  api.post(`/journeys/${journeyId}/stages`, payload).then(r => r.data)

export const updateStage = (journeyId: number, stageId: number, payload: UpdateStagePayload): Promise<JourneyDetailDto> =>
  api.put(`/journeys/${journeyId}/stages/${stageId}`, payload).then(r => r.data)

export const deleteStage = (journeyId: number, stageId: number): Promise<JourneyDetailDto> =>
  api.delete(`/journeys/${journeyId}/stages/${stageId}`).then(r => r.data)

export const reorderStages = (journeyId: number, orderedIds: number[]): Promise<JourneyDetailDto> =>
  api.put(`/journeys/${journeyId}/stages/reorder`, { orderedIds }).then(r => r.data)

// Item CRUD
export const addItem = (journeyId: number, stageId: number, payload: CreateItemPayload): Promise<JourneyDetailDto> =>
  api.post(`/journeys/${journeyId}/stages/${stageId}/items`, payload).then(r => r.data)

export const updateItem = (journeyId: number, stageId: number, itemId: number, payload: UpdateItemPayload): Promise<JourneyDetailDto> =>
  api.put(`/journeys/${journeyId}/stages/${stageId}/items/${itemId}`, payload).then(r => r.data)

export const deleteItem = (journeyId: number, stageId: number, itemId: number): Promise<JourneyDetailDto> =>
  api.delete(`/journeys/${journeyId}/stages/${stageId}/items/${itemId}`).then(r => r.data)

export const reorderItems = (journeyId: number, stageId: number, orderedIds: number[]): Promise<JourneyDetailDto> =>
  api.put(`/journeys/${journeyId}/stages/${stageId}/items/reorder`, { orderedIds }).then(r => r.data)
