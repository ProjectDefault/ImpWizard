import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2, Upload, FileText, PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  getFormDetail,
  getFormSubmission,
  saveFormDraft,
  submitForm,
  getCrossFormPrefill,
  getCrossFormDropdown,
  getDropdownOptions,
  type FormFieldForFillDto,
} from '@/api/portal'
import { getBulkSubmission, uploadBulkFile } from '@/api/bulkSubmissions'

// ── Combobox: text input with suggestion list ──────────────────────────────────

function ComboboxInput({
  value,
  onChange,
  options,
  placeholder = 'Type or select...',
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const filtered = value
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        disabled={disabled}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
          {filtered.map(opt => (
            <button
              key={opt}
              type="button"
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent"
              onMouseDown={() => { onChange(opt); setOpen(false) }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Per-field renderer (component so it can use hooks) ─────────────────────────

interface FieldRendererProps {
  field: FormFieldForFillDto
  value: string
  onChange: (value: string) => void
  isReadOnly: boolean
  projectId: number
  hasExistingSubmission: boolean
  parentValue?: string
}

function PortalFieldRenderer({
  field,
  value,
  onChange,
  isReadOnly,
  projectId,
  hasExistingSubmission,
  parentValue,
}: FieldRendererProps) {
  const preFillApplied = useRef(false)
  const isCascading = field.dependsOnFieldId != null && field.dataSourceType === 'ItemCatalog'

  // When parent value changes, clear this field's current value
  const prevParentValue = useRef(parentValue)
  useEffect(() => {
    if (isCascading && prevParentValue.current !== parentValue && prevParentValue.current !== undefined) {
      onChange('')
    }
    prevParentValue.current = parentValue
  }, [parentValue, isCascading, onChange])

  // Cross-form pre-fill — only when no existing submission and field is configured
  const { data: preFillData } = useQuery({
    queryKey: ['cross-form-prefill', projectId, field.crossFormPreFillFormId, field.crossFormPreFillFieldId],
    queryFn: () => getCrossFormPrefill(projectId, field.crossFormPreFillFormId!, field.crossFormPreFillFieldId!),
    enabled: !hasExistingSubmission && field.crossFormPreFillFormId != null && field.crossFormPreFillFieldId != null,
  })

  useEffect(() => {
    if (!preFillApplied.current && preFillData?.value != null) {
      preFillApplied.current = true
      onChange(preFillData.value)
    }
  }, [preFillData, onChange])

  // ProjectSubmission dropdown options
  const { data: crossFormOptions = [], isLoading: crossFormLoading } = useQuery({
    queryKey: ['cross-form-dropdown', projectId, field.dataSourceFormId, field.dataSourceFieldId],
    queryFn: () => getCrossFormDropdown(projectId, field.dataSourceFormId!, field.dataSourceFieldId!),
    enabled:
      field.fieldType === 'Dropdown' &&
      field.dataSourceType === 'ProjectSubmission' &&
      field.dataSourceFormId != null &&
      field.dataSourceFieldId != null,
  })

  // Static data source options (ReferenceData, ProductType, UnitOfMeasure, Category)
  const staticDataSourceTypes = ['ReferenceData', 'ProductType', 'UnitOfMeasure', 'Category', 'ItemCategory', 'ItemCatalog']
  const { data: staticOptions = [], isLoading: staticLoading } = useQuery({
    queryKey: ['dropdown-options', field.dataSourceType, field.dataSourceId, isCascading ? (parentValue ?? '') : null],
    queryFn: () => getDropdownOptions(field.dataSourceType, field.dataSourceId, isCascading ? parentValue : null),
    enabled: field.fieldType === 'Dropdown' && staticDataSourceTypes.includes(field.dataSourceType),
  })

  const isProjectSubmission = field.dataSourceType === 'ProjectSubmission'
  const dropdownOptions = isProjectSubmission ? crossFormOptions : staticOptions
  const optionsLoading = isProjectSubmission ? crossFormLoading : staticLoading

  // Auto-fill: always show as read-only with indicator
  if (field.autoFillValue != null) {
    return (
      <div className="flex items-center gap-2">
        <Input value={field.autoFillValue} disabled className="h-9 bg-muted/40" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">Auto-filled</span>
      </div>
    )
  }

  // Read-only display
  if (isReadOnly) {
    return (
      <div className="text-sm bg-muted/40 rounded px-3 py-2 min-h-[36px]">
        {field.fieldType === 'Checkbox'
          ? (value === 'true' ? 'Yes' : 'No')
          : value || <span className="text-muted-foreground italic">No answer</span>}
      </div>
    )
  }

  // Dropdown with a data source
  if (field.fieldType === 'Dropdown' && field.dataSourceType !== 'None') {
    const noOptions = !optionsLoading && dropdownOptions.length === 0

    // Combobox mode: suggestions + free text
    if (field.allowCustomValue) {
      return (
        <ComboboxInput
          value={value}
          onChange={onChange}
          options={dropdownOptions}
          placeholder={optionsLoading ? 'Loading...' : 'Type or select...'}
          disabled={optionsLoading}
        />
      )
    }

    // Validated Select mode: must pick from the list
    return (
      <Select value={value} onValueChange={onChange} disabled={optionsLoading || noOptions}>
        <SelectTrigger>
          <SelectValue
            placeholder={
              optionsLoading ? 'Loading...' : noOptions ? 'No options available yet' : 'Select...'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {dropdownOptions.map(opt => (
            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  switch (field.fieldType) {
    case 'Textarea':
      return (
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={field.maxLength ?? undefined}
          rows={3}
        />
      )
    case 'Number':
      return (
        <Input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'Date':
      return (
        <Input
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )
    case 'Checkbox':
      return (
        <div className="flex items-center gap-2 pt-1">
          <Checkbox
            id={`field-${field.id}`}
            checked={value === 'true'}
            onCheckedChange={checked => onChange(checked ? 'true' : 'false')}
          />
          <label htmlFor={`field-${field.id}`} className="text-sm cursor-pointer">
            {field.label}
          </label>
        </div>
      )
    default: // Text, Dropdown (non-ProjectSubmission)
      return (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={field.maxLength ?? undefined}
        />
      )
  }
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function PortalFormFillPage() {
  const { projectId, assignmentId } = useParams<{ projectId: string; assignmentId: string }>()
  const navigate = useNavigate()
  const pid = Number(projectId)
  const aid = Number(assignmentId)

  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [mode, setMode] = useState<'picker' | 'manual' | 'upload'>('picker')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ['portal-form-detail', pid, aid],
    queryFn: () => getFormDetail(pid, aid),
    enabled: !!pid && !!aid,
  })

  const { data: submission, isLoading: subLoading } = useQuery({
    queryKey: ['portal-form-submission', pid, aid],
    queryFn: () => getFormSubmission(pid, aid),
    enabled: !!pid && !!aid,
    retry: false,
  })

  const { data: bulkSubmission, isLoading: bulkLoading, refetch: refetchBulk } = useQuery({
    queryKey: ['portal-bulk-submission', pid, aid],
    queryFn: () => getBulkSubmission(pid, aid),
    enabled: !!pid && !!aid && form?.allowFileSubmission === true,
    retry: false,
  })

  // Initialize auto-fill field answers so they appear in the submission payload
  useEffect(() => {
    if (form) {
      setAnswers(prev => {
        const updated = { ...prev }
        for (const f of form.fields) {
          if (f.autoFillValue != null) updated[f.id] = f.autoFillValue
        }
        return updated
      })
    }
  }, [form])

  // Pre-fill answers from existing submission
  useEffect(() => {
    if (submission?.answers) {
      const filled: Record<number, string> = {}
      for (const a of submission.answers) {
        filled[a.formFieldId] = a.value
      }
      setAnswers(filled)
    }
  }, [submission])

  const isReadOnly = submission?.status === 'Submitted'

  const answerArray = () =>
    Object.entries(answers).map(([fieldId, value]) => ({
      formFieldId: Number(fieldId),
      value,
    }))

  const saveDraftMutation = useMutation({
    mutationFn: () => saveFormDraft(pid, aid, answerArray()),
    onSuccess: () => toast.success('Draft saved.'),
    onError: () => toast.error('Failed to save draft.'),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitForm(pid, aid, answerArray()),
    onSuccess: () => {
      toast.success('Form submitted successfully!')
      navigate(`/portal/${pid}`)
    },
    onError: () => toast.error('Failed to submit form.'),
  })

  const uploadMutation = useMutation({
    mutationFn: () => uploadBulkFile(pid, aid, uploadFile!),
    onSuccess: () => {
      toast.success('File uploaded successfully.')
      setUploadFile(null)
      refetchBulk()
    },
    onError: () => toast.error('Failed to upload file. Please check the file format and try again.'),
  })

  function setAnswer(fieldId: number, value: string) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const isLoading = formLoading || subLoading || (form?.allowFileSubmission === true && bulkLoading)

  // Determine which UI to show for file-submission-enabled forms
  const showBulkUI = form?.allowFileSubmission && !submission

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/portal/${pid}`)}
          className="gap-1 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Project
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !form ? (
        <div className="text-center text-muted-foreground py-12">Form not found.</div>
      ) : (
        <>
          <div className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-semibold">{form.name}</h1>
              {isReadOnly && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Submitted
                </Badge>
              )}
            </div>
            {form.description && (
              <p className="text-sm text-muted-foreground mt-1">{form.description}</p>
            )}
            {submission?.submittedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Submitted {new Date(submission.submittedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <Separator className="mb-6" />

          {/* ── File submission UI ─────────────────────────────────────────── */}
          {showBulkUI && bulkSubmission ? (
            // Existing bulk submission — show status
            bulkSubmission.status === 'Finalized' ? (
              <div className="rounded-lg border p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h2 className="font-semibold">File Upload Processed</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your file <span className="font-medium">{bulkSubmission.fileName}</span> has been reviewed.
                </p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-700 font-medium">
                    {bulkSubmission.approvedRows} row{bulkSubmission.approvedRows !== 1 ? 's' : ''} approved
                  </span>
                  {bulkSubmission.rejectedRows > 0 && (
                    <span className="text-red-600 font-medium">
                      {bulkSubmission.rejectedRows} row{bulkSubmission.rejectedRows !== 1 ? 's' : ''} rejected
                    </span>
                  )}
                </div>
                {bulkSubmission.rejectedRows > 0 && (
                  <div className="rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 space-y-1">
                    <p className="text-xs font-medium text-red-700 dark:text-red-400">Rejected rows:</p>
                    {bulkSubmission.rows
                      .filter(r => r.status === 'Rejected')
                      .map(r => (
                        <p key={r.id} className="text-xs text-red-600 dark:text-red-400">
                          Row {r.rowIndex + 1}: {r.rejectionReason ?? 'No reason provided'}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                  <h2 className="font-semibold">File Upload Pending Review</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your file <span className="font-medium">{bulkSubmission.fileName}</span> has been uploaded
                  and is pending review by your implementation team.
                </p>
                <p className="text-xs text-muted-foreground">
                  {bulkSubmission.totalRows} row{bulkSubmission.totalRows !== 1 ? 's' : ''} · Uploaded {new Date(bulkSubmission.createdAt).toLocaleDateString()}
                </p>
              </div>
            )
          ) : showBulkUI && mode === 'picker' ? (
            // Mode picker: choose between manual fill and file upload
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">How would you like to submit this form?</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setMode('manual')}
                  className="rounded-lg border-2 border-muted hover:border-primary hover:bg-muted/30 transition-colors p-6 text-left space-y-2"
                >
                  <PenLine className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Fill Out Manually</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Enter each field one at a time</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('upload')}
                  className="rounded-lg border-2 border-muted hover:border-primary hover:bg-muted/30 transition-colors p-6 text-left space-y-2"
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Upload a File</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Upload a CSV or Excel file</p>
                  </div>
                </button>
              </div>
            </div>
          ) : showBulkUI && mode === 'upload' ? (
            // File upload UI
            <div className="space-y-4">
              <div>
                <Button variant="ghost" size="sm" className="-ml-2 mb-2" onClick={() => setMode('picker')}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <h2 className="font-medium">Upload a File</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload a CSV or Excel (.xlsx) file. Your implementation team will review and map the columns.
                </p>
              </div>

              <div
                className="rounded-lg border-2 border-dashed border-muted hover:border-muted-foreground/50 transition-colors p-8 text-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-medium">{uploadFile.name}</p>
                      <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                    <p className="text-xs text-muted-foreground">.csv or .xlsx</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setMode('picker'); setUploadFile(null) }}>
                  Cancel
                </Button>
                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={!uploadFile || uploadMutation.isPending}
                >
                  {uploadMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Upload File
                </Button>
              </div>
            </div>
          ) : (
            // ── Manual form fill (existing UI) ───────────────────────────────
            <>
              {showBulkUI && mode === 'manual' && (
                <div className="flex items-center gap-2 mb-4">
                  <Button variant="ghost" size="sm" className="-ml-2" onClick={() => setMode('picker')}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                </div>
              )}
              <div className="space-y-6">
                {form.fields.map(field => (
                  <div key={field.id} className="space-y-1.5">
                    {field.fieldType !== 'Checkbox' && (
                      <Label className="text-sm font-medium">
                        {field.label}
                        {field.isRequired && <span className="text-destructive ml-1">*</span>}
                      </Label>
                    )}
                    <PortalFieldRenderer
                      field={field}
                      value={answers[field.id] ?? ''}
                      onChange={v => setAnswer(field.id, v)}
                      isReadOnly={isReadOnly}
                      projectId={pid}
                      hasExistingSubmission={!!submission}
                      parentValue={field.dependsOnFieldId != null ? (answers[field.dependsOnFieldId] ?? '') : undefined}
                    />
                    {field.maxLength && field.fieldType !== 'Checkbox' && !isReadOnly && (
                      <p className="text-xs text-muted-foreground text-right">
                        {(answers[field.id] ?? '').length} / {field.maxLength}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {!isReadOnly && (
                <>
                  <Separator className="my-6" />
                  <div className="flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => saveDraftMutation.mutate()}
                      disabled={saveDraftMutation.isPending || submitMutation.isPending}
                    >
                      {saveDraftMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Save Draft
                    </Button>
                    <Button
                      onClick={() => submitMutation.mutate()}
                      disabled={saveDraftMutation.isPending || submitMutation.isPending}
                    >
                      {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Submit
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
