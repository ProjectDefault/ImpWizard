import apiClient from './client'

export type ImportTemplateSourceType =
  | 'Form' | 'ReferenceData' | 'ProductType' | 'UnitOfMeasure' | 'Category' | 'Manual'

export interface ImportTemplateColumnDto {
  id: number
  header: string
  dataType: string
  isRequired: boolean
  sortOrder: number
  formFieldId: number | null
  productListField: string | null
  maxLength: number | null
  allowedValues: string | null
}

export interface ImportTemplateListDto {
  id: number
  name: string
  description: string | null
  sourceType: ImportTemplateSourceType
  formId: number | null
  formName: string | null
  dataBridgeType: string
  isActive: boolean
  columnCount: number
  programId: number | null
  createdAt: string
  updatedAt: string
}

export interface ImportTemplateDetailDto {
  id: number
  name: string
  description: string | null
  sourceType: ImportTemplateSourceType
  formId: number | null
  formName: string | null
  dataBridgeType: string
  isActive: boolean
  programId: number | null
  createdAt: string
  updatedAt: string
  columns: ImportTemplateColumnDto[]
}

export interface FormChangeImpactDto {
  id: number
  formChangeQueueId: number
  formId: number
  changeType: string
  projectId: number
  projectName: string
  validationIssuesJson: string | null
  isReviewed: boolean
  reviewedAt: string | null
  queuedAt: string
}

export async function getImportTemplates(): Promise<ImportTemplateListDto[]> {
  const { data } = await apiClient.get<ImportTemplateListDto[]>('/import-templates')
  return data
}

export async function getImportTemplate(id: number): Promise<ImportTemplateDetailDto> {
  const { data } = await apiClient.get<ImportTemplateDetailDto>(`/import-templates/${id}`)
  return data
}

export async function updateImportTemplate(
  id: number,
  payload: { name?: string; description?: string; isActive?: boolean }
): Promise<void> {
  await apiClient.put(`/import-templates/${id}`, payload)
}

export async function deleteImportTemplate(id: number): Promise<void> {
  await apiClient.delete(`/import-templates/${id}`)
}

export async function createImportTemplateFromDataManagement(payload: {
  sourceType: string
  sourceId?: number | null
  name: string
}): Promise<number> {
  const { data } = await apiClient.post<number>('/import-templates/from-data-management', payload)
  return data
}

export function getExportUrl(id: number, format: 'xlsx' | 'csv', sheetName?: string): string {
  const params = new URLSearchParams({ format })
  if (sheetName) params.set('sheetName', sheetName)
  return `/api/import-templates/${id}/export?${params}`
}

export async function getFormChangeImpacts(): Promise<FormChangeImpactDto[]> {
  const { data } = await apiClient.get<FormChangeImpactDto[]>('/form-change-impacts')
  return data
}

export async function markImpactReviewed(id: number): Promise<void> {
  await apiClient.put(`/form-change-impacts/${id}/review`)
}
