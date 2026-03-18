import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check, Loader2, Trash2, XCircle, RotateCcw, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  getBulkSubmission, applyColumnMapping, updateBulkCell, batchUpdateCells,
  deleteBulkRow, rejectBulkRow, restoreBulkRow, finalizeBulkSubmission,
} from '@/api/bulkSubmissions'
import type { BulkSubmissionDto, BulkSubmissionRowDto } from '@/api/bulkSubmissions'
import { getFormDetail } from '@/api/portal'
import type { FormFieldForFillDto } from '@/api/portal'

// ── helpers ────────────────────────────────────────────────────────────────────

function statusBadge(status: BulkSubmissionRowDto['status']) {
  if (status === 'Rejected')
    return <Badge variant="destructive" className="text-xs px-1.5 py-0">Rejected</Badge>
  if (status === 'Approved')
    return <Badge className="bg-green-600 hover:bg-green-600 text-xs px-1.5 py-0">Approved</Badge>
  return null
}

// ── Inline cell editor ─────────────────────────────────────────────────────────

interface CellEditorProps {
  value: string
  onSave: (v: string) => void
  onCancel: () => void
  isSaving: boolean
}

function CellEditor({ value: initialValue, onSave, onCancel, isSaving }: CellEditorProps) {
  const [v, setV] = useState(initialValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  return (
    <div className="flex items-center gap-1 min-w-[120px]">
      <Input
        ref={inputRef}
        className="h-6 text-xs px-1"
        value={v}
        onChange={e => setV(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave(v)
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => onSave(v)}
        disabled={isSaving}
      />
      {isSaving && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BulkSubmissionReviewPage() {
  const { projectId, faid } = useParams<{ projectId: string; faid: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const pid = Number(projectId)
  const aid = Number(faid)

  // Column mapping: raw header → formFieldId | null
  const [mapping, setMapping] = useState<Record<string, number | null>>({})
  const [mappingInitialized, setMappingInitialized] = useState(false)
  const [showMapping, setShowMapping] = useState(false)

  // Editing cell
  const [editingCell, setEditingCell] = useState<{ rowId: number; formFieldId: number } | null>(null)

  // Smart fill dialog
  const [smartFill, setSmartFill] = useState<{
    formFieldId: number
    fieldLabel: string
    value: string
    eligibleRows: BulkSubmissionRowDto[]
    selectedRowIds: Set<number>
  } | null>(null)

  // Reject row dialog
  const [rejectDialog, setRejectDialog] = useState<{ rowId: number; reason: string } | null>(null)

  // Finalize result dialog
  const [finalizeResult, setFinalizeResult] = useState<{ approvedCount: number; rejectedCount: number; rejectedRows: { rowIndex: number; reason: string | null }[] } | null>(null)

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: bulk, isLoading: bulkLoading } = useQuery({
    queryKey: ['bulk-review', pid, aid],
    queryFn: () => getBulkSubmission(pid, aid),
  })

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['portal-form-detail', pid, aid],
    queryFn: () => getFormDetail(pid, aid),
  })

  // ── Initialize column mapping with auto-match ──────────────────────────────

  useEffect(() => {
    if (mappingInitialized || !bulk || !form) return
    setMappingInitialized(true)
    if (bulk.status === 'Uploaded') {
      setShowMapping(true)
      const init: Record<string, number | null> = {}
      for (const header of bulk.originalHeaders) {
        const match = form.fields.find(
          f => f.label.toLowerCase() === header.toLowerCase()
        )
        init[header] = match?.id ?? null
      }
      setMapping(init)
    }
  }, [bulk, form, mappingInitialized])

  // ── Derive grid columns from first active row's cells ─────────────────────

  const activeRows = bulk?.rows.filter(r => r.status !== 'Deleted') ?? []

  const gridFields: FormFieldForFillDto[] = (() => {
    if (!form || !bulk) return []
    if (bulk.status === 'Uploaded') return []
    const firstRow = activeRows[0]
    if (!firstRow) return []
    const mappedFieldIds = new Set(firstRow.cells.map(c => c.formFieldId))
    return form.fields.filter(f => mappedFieldIds.has(f.id)).sort((a, b) => a.sortOrder - b.sortOrder)
  })()

  // ── Mutations ──────────────────────────────────────────────────────────────

  const applyMappingMutation = useMutation({
    mutationFn: () => applyColumnMapping(pid, aid, mapping),
    onSuccess: (updated) => {
      qc.setQueryData(['bulk-review', pid, aid], updated)
      setShowMapping(false)
      toast.success('Column mapping applied.')
    },
    onError: () => toast.error('Failed to apply column mapping.'),
  })

  const updateCellMutation = useMutation({
    mutationFn: ({ rowId, formFieldId, value }: { rowId: number; formFieldId: number; value: string }) =>
      updateBulkCell(pid, aid, rowId, formFieldId, value),
    onSuccess: (updatedCell, vars) => {
      qc.setQueryData(['bulk-review', pid, aid], (old: BulkSubmissionDto | undefined) => {
        if (!old) return old
        return {
          ...old,
          rows: old.rows.map(row =>
            row.id !== vars.rowId ? row : {
              ...row,
              cells: row.cells.map(c => c.id === updatedCell.id ? updatedCell : c),
            }
          ),
        }
      })
      setEditingCell(null)

      // Smart fill: find other pending rows where this field is empty
      const current = qc.getQueryData<BulkSubmissionDto>(['bulk-review', pid, aid])
      if (current && form && vars.value.trim()) {
        const field = form.fields.find(f => f.id === vars.formFieldId)
        const eligible = current.rows.filter(r =>
          r.id !== vars.rowId &&
          r.status === 'Pending' &&
          (r.cells.find(c => c.formFieldId === vars.formFieldId)?.value ?? '') === ''
        )
        if (eligible.length > 0 && field) {
          setSmartFill({
            formFieldId: vars.formFieldId,
            fieldLabel: field.label,
            value: vars.value,
            eligibleRows: eligible,
            selectedRowIds: new Set(eligible.map(r => r.id)),
          })
        }
      }
    },
    onError: () => toast.error('Failed to update cell.'),
  })

  const batchUpdateMutation = useMutation({
    mutationFn: ({ formFieldId, value, rowIds }: { formFieldId: number; value: string; rowIds: number[] }) =>
      batchUpdateCells(pid, aid, formFieldId, value, rowIds),
    onSuccess: (updatedCells, vars) => {
      qc.setQueryData(['bulk-review', pid, aid], (old: BulkSubmissionDto | undefined) => {
        if (!old) return old
        const byId = Object.fromEntries(updatedCells.map(c => [c.id, c]))
        return {
          ...old,
          rows: old.rows.map(row => ({
            ...row,
            cells: row.cells.map(c => byId[c.id] ?? c),
          })),
        }
      })
      setSmartFill(null)
      toast.success(`Applied "${vars.value}" to ${vars.rowIds.length} row${vars.rowIds.length !== 1 ? 's' : ''}.`)
    },
    onError: () => toast.error('Failed to apply batch update.'),
  })

  const deleteRowMutation = useMutation({
    mutationFn: (rowId: number) => deleteBulkRow(pid, aid, rowId),
    onSuccess: (_, rowId) => {
      qc.setQueryData(['bulk-review', pid, aid], (old: BulkSubmissionDto | undefined) => {
        if (!old) return old
        return { ...old, rows: old.rows.filter(r => r.id !== rowId) }
      })
    },
    onError: () => toast.error('Failed to delete row.'),
  })

  const rejectRowMutation = useMutation({
    mutationFn: ({ rowId, reason }: { rowId: number; reason: string }) =>
      rejectBulkRow(pid, aid, rowId, reason),
    onSuccess: (updatedRow) => {
      qc.setQueryData(['bulk-review', pid, aid], (old: BulkSubmissionDto | undefined) => {
        if (!old) return old
        return { ...old, rows: old.rows.map(r => r.id === updatedRow.id ? updatedRow : r) }
      })
      setRejectDialog(null)
    },
    onError: () => toast.error('Failed to reject row.'),
  })

  const restoreRowMutation = useMutation({
    mutationFn: (rowId: number) => restoreBulkRow(pid, aid, rowId),
    onSuccess: (updatedRow) => {
      qc.setQueryData(['bulk-review', pid, aid], (old: BulkSubmissionDto | undefined) => {
        if (!old) return old
        return { ...old, rows: old.rows.map(r => r.id === updatedRow.id ? updatedRow : r) }
      })
    },
    onError: () => toast.error('Failed to restore row.'),
  })

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeBulkSubmission(pid, aid),
    onSuccess: (result) => {
      setFinalizeResult(result)
      qc.invalidateQueries({ queryKey: ['bulk-review', pid, aid] })
    },
    onError: () => toast.error('Failed to finalize submission.'),
  })

  const isLoading = bulkLoading || formLoading

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost" size="sm"
            onClick={() => navigate(`/admin/projects/${pid}`)}
            className="gap-1 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Project
          </Button>
          {bulk && (
            <div>
              <h1 className="text-xl font-semibold">File Upload Review</h1>
              <p className="text-sm text-muted-foreground">
                {bulk.fileName} · {bulk.totalRows} rows
                {bulk.uploadedByName && ` · Uploaded by ${bulk.uploadedByName}`}
              </p>
            </div>
          )}
        </div>
        {bulk?.status === 'InReview' && (
          <Button
            onClick={() => {
              const pending = activeRows.filter(r => r.status === 'Pending').length
              if (confirm(`Finalize? ${pending} pending rows will become submissions. Rejected rows will not be submitted.`))
                finalizeMutation.mutate()
            }}
            disabled={finalizeMutation.isPending}
          >
            {finalizeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Check className="h-4 w-4 mr-1.5" />
            Finalize
          </Button>
        )}
        {bulk?.status === 'Finalized' && (
          <Badge className="bg-green-600 hover:bg-green-600">Finalized</Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !bulk || !form ? (
        <p className="text-muted-foreground">Bulk submission not found.</p>
      ) : (
        <>
          {/* ── Column Mapping Section ─────────────────────────────────────── */}
          {(bulk.status === 'Uploaded' || showMapping) && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-medium">Column Mapping</h2>
                  <p className="text-sm text-muted-foreground">Match each file column to a form field.</p>
                </div>
                {bulk.status !== 'Uploaded' && (
                  <Button variant="ghost" size="sm" onClick={() => setShowMapping(false)}>Cancel</Button>
                )}
              </div>

              <div className="grid gap-2">
                {bulk.originalHeaders.map(header => (
                  <div key={header} className="flex items-center gap-3">
                    <span className="text-sm w-48 truncate font-mono bg-muted rounded px-2 py-1">{header}</span>
                    <span className="text-muted-foreground text-sm">→</span>
                    <Select
                      value={mapping[header] != null ? String(mapping[header]) : '__none__'}
                      onValueChange={v => setMapping(prev => ({ ...prev, [header]: v === '__none__' ? null : Number(v) }))}
                    >
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Skip this column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Skip this column —</SelectItem>
                        {form.fields.filter(f => f.autoFillValue == null).map(f => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => applyMappingMutation.mutate()}
                  disabled={applyMappingMutation.isPending}
                >
                  {applyMappingMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Apply Mapping
                </Button>
              </div>
            </div>
          )}

          {/* ── Remap button (when already mapped) ────────────────────────── */}
          {bulk.status === 'InReview' && !showMapping && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">
                {bulk.pendingRows} pending · {bulk.rejectedRows} rejected
              </span>
              <Button variant="outline" size="sm" onClick={() => {
                // Re-initialize mapping from headers before showing
                const init: Record<string, number | null> = {}
                for (const header of bulk.originalHeaders) {
                  const match = form.fields.find(f => f.label.toLowerCase() === header.toLowerCase())
                  init[header] = match?.id ?? null
                }
                setMapping(init)
                setShowMapping(true)
              }}>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />
                Remap Columns
              </Button>
            </div>
          )}

          {/* ── Grid ──────────────────────────────────────────────────────── */}
          {bulk.status !== 'Uploaded' && gridFields.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="text-sm w-full border-collapse">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-xs text-muted-foreground w-12 border-r">#</th>
                      {gridFields.map(f => (
                        <th key={f.id} className="px-3 py-2 text-left font-medium text-xs whitespace-nowrap border-r last:border-r-0">
                          {f.label}
                          {f.autoFillValue != null && (
                            <span className="ml-1 text-muted-foreground font-normal">(auto)</span>
                          )}
                        </th>
                      ))}
                      <th className="px-3 py-2 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeRows.map(row => {
                      const isRejected = row.status === 'Rejected'
                      const isFinalized = bulk.status === 'Finalized'
                      return (
                        <tr
                          key={row.id}
                          className={`border-t ${isRejected ? 'bg-red-50 dark:bg-red-950/20' : 'hover:bg-muted/20'}`}
                        >
                          <td className="px-3 py-1.5 text-muted-foreground border-r align-top">
                            <div className="flex flex-col gap-1">
                              <span>{row.rowIndex + 1}</span>
                              {statusBadge(row.status)}
                              {isRejected && row.rejectionReason && (
                                <span className="text-xs text-red-600 max-w-[80px] break-words leading-tight">
                                  {row.rejectionReason}
                                </span>
                              )}
                            </div>
                          </td>
                          {gridFields.map(field => {
                            const cell = row.cells.find(c => c.formFieldId === field.id)
                            const isEditing = editingCell?.rowId === row.id && editingCell?.formFieldId === field.id
                            const isSaving = updateCellMutation.isPending &&
                              updateCellMutation.variables?.rowId === row.id &&
                              updateCellMutation.variables?.formFieldId === field.id
                            const isAutoFill = field.autoFillValue != null
                            const canEdit = !isRejected && !isFinalized && !isAutoFill

                            return (
                              <td
                                key={field.id}
                                className={`px-2 py-1.5 border-r last:border-r-0 align-top min-w-[100px] ${canEdit ? 'cursor-pointer' : ''}`}
                                onClick={() => {
                                  if (canEdit && !isEditing)
                                    setEditingCell({ rowId: row.id, formFieldId: field.id })
                                }}
                              >
                                {isEditing ? (
                                  <CellEditor
                                    value={cell?.value ?? ''}
                                    onSave={v => updateCellMutation.mutate({ rowId: row.id, formFieldId: field.id, value: v })}
                                    onCancel={() => setEditingCell(null)}
                                    isSaving={isSaving}
                                  />
                                ) : (
                                  <span className={`text-sm ${!cell?.value ? 'text-muted-foreground italic' : ''}`}>
                                    {cell?.value || (isAutoFill ? <span className="text-muted-foreground not-italic text-xs">auto</span> : '—')}
                                  </span>
                                )}
                              </td>
                            )
                          })}
                          <td className="px-2 py-1 align-top">
                            {!isFinalized && (
                              <div className="flex items-center gap-0.5">
                                {isRejected ? (
                                  <Button
                                    size="icon" variant="ghost" className="h-6 w-6"
                                    title="Restore row"
                                    onClick={() => restoreRowMutation.mutate(row.id)}
                                    disabled={restoreRowMutation.isPending}
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="icon" variant="ghost" className="h-6 w-6 text-amber-600 hover:text-amber-700"
                                    title="Reject row"
                                    onClick={() => setRejectDialog({ rowId: row.id, reason: '' })}
                                  >
                                    <XCircle className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="icon" variant="ghost" className="h-6 w-6 text-destructive"
                                  title="Delete row"
                                  onClick={() => {
                                    if (confirm('Delete this row?')) deleteRowMutation.mutate(row.id)
                                  }}
                                  disabled={deleteRowMutation.isPending}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Smart Fill Dialog ──────────────────────────────────────────────── */}
      <Dialog open={smartFill != null} onOpenChange={open => { if (!open) setSmartFill(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply to Other Rows?</DialogTitle>
          </DialogHeader>
          {smartFill && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Apply <span className="font-medium text-foreground">"{smartFill.value}"</span> to{' '}
                <span className="font-medium text-foreground">{smartFill.fieldLabel}</span> for other rows with this field empty?
              </p>

              <div className="rounded-md border max-h-48 overflow-y-auto divide-y">
                <div className="px-3 py-2 flex items-center gap-2 bg-muted/30">
                  <Checkbox
                    id="smart-fill-all"
                    checked={smartFill.selectedRowIds.size === smartFill.eligibleRows.length}
                    onCheckedChange={checked => setSmartFill(prev => prev ? {
                      ...prev,
                      selectedRowIds: checked
                        ? new Set(prev.eligibleRows.map(r => r.id))
                        : new Set(),
                    } : prev)}
                  />
                  <label htmlFor="smart-fill-all" className="text-sm font-medium cursor-pointer">
                    Select All ({smartFill.eligibleRows.length} rows)
                  </label>
                </div>
                {smartFill.eligibleRows.map(row => (
                  <div key={row.id} className="px-3 py-1.5 flex items-center gap-2">
                    <Checkbox
                      id={`sf-row-${row.id}`}
                      checked={smartFill.selectedRowIds.has(row.id)}
                      onCheckedChange={checked => setSmartFill(prev => {
                        if (!prev) return prev
                        const next = new Set(prev.selectedRowIds)
                        checked ? next.add(row.id) : next.delete(row.id)
                        return { ...prev, selectedRowIds: next }
                      })}
                    />
                    <label htmlFor={`sf-row-${row.id}`} className="text-sm cursor-pointer">
                      Row {row.rowIndex + 1}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmartFill(null)}>Cancel</Button>
            <Button
              disabled={!smartFill || smartFill.selectedRowIds.size === 0 || batchUpdateMutation.isPending}
              onClick={() => {
                if (!smartFill) return
                batchUpdateMutation.mutate({
                  formFieldId: smartFill.formFieldId,
                  value: smartFill.value,
                  rowIds: [...smartFill.selectedRowIds],
                })
              }}
            >
              {batchUpdateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Apply to Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Row Dialog ─────────────────────────────────────────────── */}
      <Dialog open={rejectDialog != null} onOpenChange={open => { if (!open) setRejectDialog(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Row</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              value={rejectDialog?.reason ?? ''}
              onChange={e => setRejectDialog(prev => prev ? { ...prev, reason: e.target.value } : prev)}
              placeholder="Why is this row being rejected?"
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectDialog?.reason.trim() || rejectRowMutation.isPending}
              onClick={() => {
                if (!rejectDialog) return
                rejectRowMutation.mutate({ rowId: rejectDialog.rowId, reason: rejectDialog.reason.trim() })
              }}
            >
              {rejectRowMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Finalize Result Dialog ────────────────────────────────────────── */}
      <Dialog open={finalizeResult != null} onOpenChange={open => { if (!open) setFinalizeResult(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Submission Finalized</DialogTitle>
          </DialogHeader>
          {finalizeResult && (
            <div className="space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-green-700 font-medium">
                  {finalizeResult.approvedCount} approved
                </span>
                {finalizeResult.rejectedCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {finalizeResult.rejectedCount} rejected
                  </span>
                )}
              </div>
              {finalizeResult.rejectedRows.length > 0 && (
                <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 space-y-1 max-h-40 overflow-y-auto">
                  {finalizeResult.rejectedRows.map(r => (
                    <p key={r.rowIndex} className="text-xs text-red-600 dark:text-red-400">
                      Row {r.rowIndex + 1}: {r.reason ?? 'No reason'}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => { setFinalizeResult(null); navigate(`/admin/projects/${pid}`) }}>
              Back to Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
