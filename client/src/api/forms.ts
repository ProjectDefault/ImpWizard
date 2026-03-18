import apiClient from './client'

// ── Field types ───────────────────────────────────────────────────────────────

export const FIELD_TYPES = ['Text', 'Number', 'Date', 'Dropdown', 'Checkbox', 'Textarea'] as const
export type FieldType = typeof FIELD_TYPES[number]

export const DATA_SOURCE_TYPES = ['None', 'ReferenceData', 'ProductType', 'UnitOfMeasure', 'Category', 'ItemCategory', 'ItemCatalog', 'ProjectSubmission'] as const
export type DataSourceType = typeof DATA_SOURCE_TYPES[number]

export const LOCK_SCOPES = ['Field', 'EntireForm'] as const
export type LockScope = typeof LOCK_SCOPES[number]

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface FormFieldDto {
  id: number
  formId: number
  label: string
  fieldType: FieldType
  isRequired: boolean
  sortOrder: number
  isArchived: boolean
  dataSourceType: DataSourceType
  dataSourceId: number | null
  dataSourceName: string | null
  lockedUntilFormId: number | null
  lockedUntilFormName: string | null
  lockScope: LockScope
  maxLength: number | null
  crossFormPreFillFormId: number | null
  crossFormPreFillFieldId: number | null
  crossFormPreFillFieldLabel: string | null
  dataSourceFormId: number | null
  dataSourceFieldId: number | null
  dataSourceFormName: string | null
  importTemplateHeader: string | null
  allowCustomValue: boolean
  autoFillValue: string | null
  createdAt: string
  updatedAt: string
}

export type FormStatus = 'Draft' | 'Unlocked' | 'Locked'

export interface FormListDto {
  id: number
  name: string
  description: string | null
  isActive: boolean
  status: FormStatus
  sortOrder: number
  fieldCount: number
  programId: number | null
  allowFileSubmission: boolean
  createdAt: string
  updatedAt: string
}

export interface FormDetailDto {
  id: number
  name: string
  description: string | null
  isActive: boolean
  status: FormStatus
  sortOrder: number
  programId: number | null
  allowFileSubmission: boolean
  createdAt: string
  updatedAt: string
  fields: FormFieldDto[]
}

export interface CreateFormPayload {
  name: string
  description?: string
  sortOrder?: number
  programId?: number
}

export interface UpdateFormPayload {
  name?: string
  description?: string
  isActive?: boolean
  sortOrder?: number
  programId?: number | null
  allowFileSubmission?: boolean
}

export interface CreateFormFieldPayload {
  label: string
  fieldType: FieldType
  isRequired: boolean
  sortOrder: number
  dataSourceType: DataSourceType
  dataSourceId?: number | null
  lockedUntilFormId?: number | null
  lockScope?: LockScope
  maxLength?: number | null
}

export interface UpdateFormFieldPayload {
  label?: string
  fieldType?: FieldType
  isRequired?: boolean
  sortOrder?: number
  dataSourceType?: DataSourceType
  dataSourceId?: number | null
  lockedUntilFormId?: number | null
  lockScope?: LockScope
  isArchived?: boolean
  maxLength?: number | null
  clearMaxLength?: boolean
  crossFormPreFillFormId?: number | null
  crossFormPreFillFieldId?: number | null
  dataSourceFormId?: number | null
  dataSourceFieldId?: number | null
  importTemplateHeader?: string | null
  clearImportTemplateHeader?: boolean
  allowCustomValue?: boolean
  autoFillValue?: string | null
  clearAutoFillValue?: boolean
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getForms(): Promise<FormListDto[]> {
  const { data } = await apiClient.get<FormListDto[]>('/forms')
  return data
}

export async function getForm(id: number): Promise<FormDetailDto> {
  const { data } = await apiClient.get<FormDetailDto>(`/forms/${id}`)
  return data
}

export async function createForm(payload: CreateFormPayload): Promise<FormDetailDto> {
  const { data } = await apiClient.post<FormDetailDto>('/forms', payload)
  return data
}

export async function updateForm(id: number, payload: UpdateFormPayload): Promise<FormDetailDto> {
  const { data } = await apiClient.put<FormDetailDto>(`/forms/${id}`, payload)
  return data
}

export async function deleteForm(id: number): Promise<void> {
  await apiClient.delete(`/forms/${id}`)
}

export async function duplicateForm(id: number): Promise<FormDetailDto> {
  const { data } = await apiClient.post<FormDetailDto>(`/forms/${id}/duplicate`)
  return data
}

export async function createFormField(formId: number, payload: CreateFormFieldPayload): Promise<FormFieldDto> {
  const { data } = await apiClient.post<FormFieldDto>(`/forms/${formId}/fields`, payload)
  return data
}

export async function updateFormField(formId: number, fieldId: number, payload: UpdateFormFieldPayload): Promise<FormFieldDto> {
  const { data } = await apiClient.put<FormFieldDto>(`/forms/${formId}/fields/${fieldId}`, payload)
  return data
}

export async function deleteFormField(formId: number, fieldId: number): Promise<void> {
  await apiClient.delete(`/forms/${formId}/fields/${fieldId}`)
}

export async function reorderFormFields(formId: number, fieldIds: number[]): Promise<void> {
  await apiClient.put(`/forms/${formId}/fields/reorder`, { fieldIds })
}

export async function updateFormStatus(id: number, status: FormStatus): Promise<FormDetailDto> {
  const { data } = await apiClient.put<FormDetailDto>(`/forms/${id}/status`, { status })
  return data
}
