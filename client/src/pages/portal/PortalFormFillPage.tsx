import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react'
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
}

function PortalFieldRenderer({
  field,
  value,
  onChange,
  isReadOnly,
  projectId,
  hasExistingSubmission,
}: FieldRendererProps) {
  const preFillApplied = useRef(false)

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
  const staticDataSourceTypes = ['ReferenceData', 'ProductType', 'UnitOfMeasure', 'Category', 'ItemCategory']
  const { data: staticOptions = [], isLoading: staticLoading } = useQuery({
    queryKey: ['dropdown-options', field.dataSourceType, field.dataSourceId],
    queryFn: () => getDropdownOptions(field.dataSourceType, field.dataSourceId),
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

  function setAnswer(fieldId: number, value: string) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
  }

  const isLoading = formLoading || subLoading

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
    </div>
  )
}
