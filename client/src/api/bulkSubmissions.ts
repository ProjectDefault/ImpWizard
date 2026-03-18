import api from './client'

export interface BulkSubmissionCellDto {
  id: number
  formFieldId: number
  value: string
}

export interface BulkSubmissionRowDto {
  id: number
  rowIndex: number
  status: 'Pending' | 'Approved' | 'Rejected' | 'Deleted'
  rejectionReason: string | null
  rawData: Record<string, string>
  cells: BulkSubmissionCellDto[]
}

export interface BulkSubmissionDto {
  id: number
  projectFormAssignmentId: number
  fileName: string
  originalHeaders: string[]
  status: 'Uploaded' | 'InReview' | 'Finalized'
  totalRows: number
  pendingRows: number
  approvedRows: number
  rejectedRows: number
  uploadedByName: string | null
  createdAt: string
  updatedAt: string
  rows: BulkSubmissionRowDto[]
}

export interface FinalizeResultDto {
  approvedCount: number
  rejectedCount: number
  rejectedRows: { rowIndex: number; reason: string | null }[]
}

const base = (projectId: number, faid: number) =>
  `/portal/projects/${projectId}/forms/${faid}/bulk`

export const uploadBulkFile = (
  projectId: number,
  faid: number,
  file: File
): Promise<BulkSubmissionDto> => {
  const form = new FormData()
  form.append('file', file)
  return api.post(`${base(projectId, faid)}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}

export const getBulkSubmission = (
  projectId: number,
  faid: number
): Promise<BulkSubmissionDto> =>
  api.get(base(projectId, faid)).then(r => r.data)

export const applyColumnMapping = (
  projectId: number,
  faid: number,
  mapping: Record<string, number | null>
): Promise<BulkSubmissionDto> =>
  api.put(`${base(projectId, faid)}/column-mapping`, { mapping }).then(r => r.data)

export const updateBulkCell = (
  projectId: number,
  faid: number,
  rowId: number,
  formFieldId: number,
  value: string
): Promise<BulkSubmissionCellDto> =>
  api.put(`${base(projectId, faid)}/rows/${rowId}/cell`, { formFieldId, value }).then(r => r.data)

export const batchUpdateCells = (
  projectId: number,
  faid: number,
  formFieldId: number,
  value: string,
  rowIds: number[]
): Promise<BulkSubmissionCellDto[]> =>
  api.put(`${base(projectId, faid)}/rows/batch-cells`, { formFieldId, value, rowIds }).then(r => r.data)

export const deleteBulkRow = (
  projectId: number,
  faid: number,
  rowId: number
): Promise<void> =>
  api.delete(`${base(projectId, faid)}/rows/${rowId}`).then(() => undefined)

export const rejectBulkRow = (
  projectId: number,
  faid: number,
  rowId: number,
  reason: string
): Promise<BulkSubmissionRowDto> =>
  api.put(`${base(projectId, faid)}/rows/${rowId}/reject`, { reason }).then(r => r.data)

export const restoreBulkRow = (
  projectId: number,
  faid: number,
  rowId: number
): Promise<BulkSubmissionRowDto> =>
  api.put(`${base(projectId, faid)}/rows/${rowId}/restore`).then(r => r.data)

export const finalizeBulkSubmission = (
  projectId: number,
  faid: number
): Promise<FinalizeResultDto> =>
  api.post(`${base(projectId, faid)}/finalize`).then(r => r.data)
