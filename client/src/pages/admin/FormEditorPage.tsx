import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, GripVertical, Trash2, Check, X,
  Lock, Unlock, LockOpen, ChevronDown, ChevronUp, Eye, LayoutList, Table2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getForm, createFormField, updateFormField, deleteFormField, reorderFormFields,
  updateFormStatus, FIELD_TYPES,
} from '@/api/forms'
import type { FormFieldDto, FieldType, DataSourceType, LockScope, FormStatus } from '@/api/forms'
import { getForms } from '@/api/forms'
import { FormFieldTypeBadge } from '@/components/forms/FormFieldTypeBadge'
import { FormFieldTypeIcon } from '@/components/forms/FormFieldTypeIcon'
import { FieldDataSourcePicker } from '@/components/forms/FieldDataSourcePicker'

// ── Sortable field card ────────────────────────────────────────────────────────

function SortableFieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
  isDeletePending,
}: {
  field: FormFieldDto
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  isDeletePending: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={`flex items-center gap-2 p-2.5 rounded-md border cursor-pointer group transition-colors ${
        isSelected
          ? 'bg-primary/5 border-primary/30'
          : 'bg-background hover:bg-muted/50 border-border'
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        onClick={e => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <FormFieldTypeIcon
        type={field.fieldType}
        className="h-3.5 w-3.5 text-muted-foreground shrink-0"
      />

      <span className="text-sm flex-1 truncate">{field.label}</span>

      <div className="flex items-center gap-1 shrink-0">
        {field.isRequired && (
          <span className="text-xs text-destructive">*</span>
        )}
        {field.lockedUntilFormId && (
          <Lock className="h-3 w-3 text-muted-foreground" />
        )}
        <FormFieldTypeBadge type={field.fieldType} />
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          disabled={isDeletePending}
          className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Field config panel ────────────────────────────────────────────────────────

function FieldConfigPanel({
  field,
  allForms,
  formId,
  onSaved,
  onClose,
}: {
  field: FormFieldDto
  allForms: { id: number; name: string }[]
  formId: number
  onSaved: (updated: FormFieldDto) => void
  onClose: () => void
}) {
  const [label, setLabel] = useState(field.label)
  const [fieldType, setFieldType] = useState<FieldType>(field.fieldType)
  const [isRequired, setIsRequired] = useState(field.isRequired)
  const [dataSourceType, setDataSourceType] = useState<DataSourceType>(field.dataSourceType)
  const [dataSourceId, setDataSourceId] = useState<number | null>(field.dataSourceId)
  const [dataSourceFormId, setDataSourceFormId] = useState<number | null>(field.dataSourceFormId)
  const [dataSourceFieldId, setDataSourceFieldId] = useState<number | null>(field.dataSourceFieldId)
  const [lockedUntilFormId, setLockedUntilFormId] = useState<number | null>(field.lockedUntilFormId)
  const [lockScope, setLockScope] = useState<LockScope>(field.lockScope)
  const [maxLength, setMaxLength] = useState<number | null>(field.maxLength)
  const [preFillFormId, setPreFillFormId] = useState<number | null>(field.crossFormPreFillFormId)
  const [preFillFieldId, setPreFillFieldId] = useState<number | null>(field.crossFormPreFillFieldId)
  const [importTemplateHeader, setImportTemplateHeader] = useState(field.importTemplateHeader ?? '')
  const [allowCustomValue, setAllowCustomValue] = useState(field.allowCustomValue)

  const { data: preFillSourceForm } = useQuery({
    queryKey: ['forms', preFillFormId],
    queryFn: () => getForm(preFillFormId!),
    enabled: preFillFormId != null,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateFormField>[2]) =>
      updateFormField(formId, field.id, payload),
    onSuccess: (updated) => {
      onSaved(updated)
      toast.success('Field saved')
    },
    onError: () => toast.error('Failed to save field'),
  })

  const isDirty =
    label !== field.label ||
    fieldType !== field.fieldType ||
    isRequired !== field.isRequired ||
    dataSourceType !== field.dataSourceType ||
    dataSourceId !== field.dataSourceId ||
    dataSourceFormId !== field.dataSourceFormId ||
    dataSourceFieldId !== field.dataSourceFieldId ||
    lockedUntilFormId !== field.lockedUntilFormId ||
    lockScope !== field.lockScope ||
    maxLength !== field.maxLength ||
    preFillFormId !== field.crossFormPreFillFormId ||
    preFillFieldId !== field.crossFormPreFillFieldId ||
    importTemplateHeader !== (field.importTemplateHeader ?? '') ||
    allowCustomValue !== field.allowCustomValue

  function handleSave() {
    if (!label.trim()) { toast.error('Label is required'); return }
    const hasMaxLength = fieldType === 'Text' || fieldType === 'Textarea'
    const isDropdown = fieldType === 'Dropdown'
    updateMutation.mutate({
      label: label.trim(),
      fieldType,
      isRequired,
      dataSourceType: isDropdown ? dataSourceType : 'None',
      dataSourceId: isDropdown ? dataSourceId : null,
      dataSourceFormId: isDropdown && dataSourceType === 'ProjectSubmission' ? (dataSourceFormId ?? 0) : 0,
      dataSourceFieldId: isDropdown && dataSourceType === 'ProjectSubmission' ? (dataSourceFieldId ?? 0) : 0,
      lockedUntilFormId: lockedUntilFormId ?? 0,
      lockScope,
      crossFormPreFillFormId: !isDropdown ? (preFillFormId ?? 0) : 0,
      crossFormPreFillFieldId: !isDropdown ? (preFillFieldId ?? 0) : 0,
      allowCustomValue: isDropdown ? allowCustomValue : false,
      ...(importTemplateHeader.trim()
        ? { importTemplateHeader: importTemplateHeader.trim() }
        : { clearImportTemplateHeader: true }),
      ...(hasMaxLength
        ? maxLength != null ? { maxLength } : { clearMaxLength: true }
        : { clearMaxLength: true }),
    })
  }

  // Reset data source / pre-fill when changing field type
  useEffect(() => {
    if (fieldType !== 'Dropdown') {
      setDataSourceType('None')
      setDataSourceId(null)
      setDataSourceFormId(null)
      setDataSourceFieldId(null)
      setAllowCustomValue(false)
    } else {
      setPreFillFormId(null)
      setPreFillFieldId(null)
    }
    if (fieldType !== 'Text' && fieldType !== 'Textarea') {
      setMaxLength(null)
    }
  }, [fieldType])

  const otherForms = allForms.filter(f => f.id !== formId)

  return (
    <div className="border rounded-md p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Edit Field
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <Label className="text-xs">Label</Label>
        <Input
          value={label}
          onChange={e => setLabel(e.target.value)}
          className="h-7 text-sm"
          autoFocus
        />
      </div>

      {/* Import Template Header override */}
      <div className="space-y-1">
        <Label className="text-xs">Import Template Header <span className="text-muted-foreground">(optional override)</span></Label>
        <Input
          value={importTemplateHeader}
          onChange={e => setImportTemplateHeader(e.target.value)}
          placeholder={label || 'Same as label'}
          className="h-7 text-sm"
        />
      </div>

      {/* Field Type */}
      <div className="space-y-1">
        <Label className="text-xs">Field Type</Label>
        <Select value={fieldType} onValueChange={v => setFieldType(v as FieldType)}>
          <SelectTrigger className="h-7 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data Source (only for Dropdown) */}
      {fieldType === 'Dropdown' && (
        <>
          <FieldDataSourcePicker
            dataSourceType={dataSourceType}
            dataSourceId={dataSourceId}
            dataSourceFormId={dataSourceFormId}
            dataSourceFieldId={dataSourceFieldId}
            onTypeChange={setDataSourceType}
            onIdChange={setDataSourceId}
            onFormIdChange={setDataSourceFormId}
            onFieldIdChange={setDataSourceFieldId}
            allForms={otherForms}
          />

          {/* Allow custom value (combobox mode) */}
          {dataSourceType !== 'None' && (
            <div className="flex items-center gap-2 pt-1">
              <Switch
                id={`custom-${field.id}`}
                checked={allowCustomValue}
                onCheckedChange={setAllowCustomValue}
                className="scale-90"
              />
              <Label htmlFor={`custom-${field.id}`} className="text-xs cursor-pointer">
                Allow custom value
              </Label>
            </div>
          )}
        </>
      )}

      {/* Required */}
      <div className="flex items-center gap-2">
        <Switch
          id={`req-${field.id}`}
          checked={isRequired}
          onCheckedChange={setIsRequired}
          className="scale-90"
        />
        <Label htmlFor={`req-${field.id}`} className="text-xs cursor-pointer">Required</Label>
      </div>

      {/* Character limit (Text / Textarea only) */}
      {(fieldType === 'Text' || fieldType === 'Textarea') && (
        <div className="space-y-1">
          <Label className="text-xs">Character limit <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            type="number"
            min={1}
            value={maxLength ?? ''}
            onChange={e => setMaxLength(e.target.value ? Number(e.target.value) : null)}
            placeholder="No limit"
            className="h-7 text-sm w-28"
          />
        </div>
      )}

      {/* Pre-fill from prior submission (non-dropdown fields only) */}
      {fieldType !== 'Dropdown' && (
        <div className="space-y-1.5 pt-1 border-t">
          <Label className="text-xs text-muted-foreground">Pre-fill from prior submission</Label>
          <Select
            value={preFillFormId?.toString() ?? 'none'}
            onValueChange={v => { setPreFillFormId(v === 'none' ? null : Number(v)); setPreFillFieldId(null) }}
          >
            <SelectTrigger className="h-7 text-sm">
              <SelectValue placeholder="No pre-fill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No pre-fill</SelectItem>
              {otherForms.map(f => (
                <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {preFillFormId != null && (
            <Select
              value={preFillFieldId?.toString() ?? ''}
              onValueChange={v => setPreFillFieldId(v ? Number(v) : null)}
              disabled={!preFillSourceForm}
            >
              <SelectTrigger className="h-7 text-sm">
                <SelectValue placeholder="Select source field..." />
              </SelectTrigger>
              <SelectContent>
                {(preFillSourceForm?.fields.filter(f => !f.isArchived) ?? []).map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {preFillFormId != null && (
            <p className="text-xs text-muted-foreground">
              This field will be pre-filled with the most recent submitted answer from the selected form on this project.
            </p>
          )}
        </div>
      )}

      {/* Dependency lock */}
      <div className="space-y-1.5 pt-1 border-t">
        <Label className="text-xs text-muted-foreground">Lock until form is approved</Label>
        <Select
          value={lockedUntilFormId?.toString() ?? 'none'}
          onValueChange={v => setLockedUntilFormId(v === 'none' ? null : Number(v))}
        >
          <SelectTrigger className="h-7 text-sm">
            <SelectValue placeholder="No dependency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No dependency</SelectItem>
            {otherForms.map(f => (
              <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {lockedUntilFormId && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lock scope</Label>
            <Select value={lockScope} onValueChange={v => setLockScope(v as LockScope)}>
              <SelectTrigger className="h-7 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Field">This field only</SelectItem>
                <SelectItem value="EntireForm">Entire form</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="flex-1"
          onClick={handleSave}
          disabled={updateMutation.isPending || !isDirty}
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {updateMutation.isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Live Preview ──────────────────────────────────────────────────────────────

function FieldInput({ field }: { field: FormFieldDto }) {
  if (field.fieldType === 'Text') return (
    <Input disabled placeholder={`Enter ${field.label.toLowerCase()}...`} className="h-8"
      maxLength={field.maxLength ?? undefined} />
  )
  if (field.fieldType === 'Number') return (
    <Input disabled type="number" placeholder="0" className="h-8 w-32" />
  )
  if (field.fieldType === 'Date') return (
    <Input disabled type="date" className="h-8 w-44" />
  )
  if (field.fieldType === 'Textarea') return (
    <textarea
      disabled rows={2}
      placeholder={`Enter ${field.label.toLowerCase()}...`}
      maxLength={field.maxLength ?? undefined}
      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none opacity-50 cursor-not-allowed"
    />
  )
  if (field.fieldType === 'Checkbox') return (
    <div className="flex items-center gap-2">
      <input type="checkbox" disabled className="h-4 w-4" />
      <span className="text-sm text-muted-foreground">{field.label}</span>
    </div>
  )
  if (field.fieldType === 'Dropdown') return (
    <Select disabled>
      <SelectTrigger className="h-8 w-56 opacity-50">
        <SelectValue placeholder={field.dataSourceName ? `From: ${field.dataSourceName}` : 'Select...'} />
      </SelectTrigger>
      <SelectContent />
    </Select>
  )
  return null
}

function FormPreview({ fields }: { fields: FormFieldDto[] }) {
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form')
  const visible = fields.filter(f => !f.isArchived)

  if (visible.length === 0) {
    return (
      <div className="flex-1 rounded-md border border-dashed flex items-center justify-center">
        <div className="text-center">
          <Eye className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Add fields to see a preview</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 rounded-md border flex flex-col overflow-hidden">
      {/* Preview header with toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Live Preview</p>
        <div className="flex items-center gap-1 rounded-md border p-0.5 bg-background">
          <button
            onClick={() => setViewMode('form')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'form' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" />
            Form
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              viewMode === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Table
          </button>
        </div>
      </div>

      {/* Form view */}
      {viewMode === 'form' && (
        <div className="overflow-y-auto p-4 space-y-4">
          {visible.map(field => (
            <div key={field.id} className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                {field.label}
                {field.isRequired && <span className="text-destructive">*</span>}
                {field.lockedUntilFormId && <Lock className="h-3 w-3 text-muted-foreground" />}
                {field.maxLength && (
                  <span className="text-xs text-muted-foreground font-normal">
                    (max {field.maxLength} chars)
                  </span>
                )}
              </Label>
              <FieldInput field={field} />
            </div>
          ))}
        </div>
      )}

      {/* Table view */}
      {viewMode === 'table' && (
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="bg-muted/50 border-b">
                {visible.map(field => (
                  <th key={field.id} className="text-left px-3 py-2 font-medium text-xs whitespace-nowrap border-r last:border-r-0">
                    <span className="flex items-center gap-1">
                      {field.label}
                      {field.isRequired && <span className="text-destructive">*</span>}
                      {field.lockedUntilFormId && <Lock className="h-2.5 w-2.5 text-muted-foreground" />}
                    </span>
                    {field.maxLength && (
                      <span className="text-muted-foreground font-normal">max {field.maxLength}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(row => (
                <tr key={row} className="border-b last:border-b-0 hover:bg-muted/30">
                  {visible.map(field => (
                    <td key={field.id} className="px-2 py-1.5 border-r last:border-r-0 min-w-[120px]">
                      {field.fieldType === 'Checkbox' ? (
                        <input type="checkbox" disabled className="h-4 w-4" />
                      ) : field.fieldType === 'Dropdown' ? (
                        <Select disabled>
                          <SelectTrigger className="h-7 text-xs opacity-50 min-w-[100px]">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent />
                        </Select>
                      ) : (
                        <Input
                          disabled
                          type={field.fieldType === 'Number' ? 'number' : field.fieldType === 'Date' ? 'date' : 'text'}
                          className="h-7 text-xs"
                          placeholder={field.fieldType === 'Number' ? '0' : field.fieldType === 'Date' ? '' : '...'}
                          maxLength={field.maxLength ?? undefined}
                        />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 border-t bg-muted/20">
            <button className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors">
              <Plus className="h-3 w-3" />
              Add row
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Dependencies tab ──────────────────────────────────────────────────────────

function DependenciesTab({
  fields,
  allForms,
  formId,
  onFieldUpdated,
}: {
  fields: FormFieldDto[]
  allForms: { id: number; name: string }[]
  formId: number
  onFieldUpdated: (updated: FormFieldDto) => void
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkFormId, setBulkFormId] = useState<string>('none')
  const [bulkScope, setBulkScope] = useState<LockScope>('Field')
  const qc = useQueryClient()

  const visible = fields.filter(f => !f.isArchived)
  const otherForms = allForms.filter(f => f.id !== formId)

  const updateMutation = useMutation({
    mutationFn: ({ fieldId, ...payload }: { fieldId: number } & Parameters<typeof updateFormField>[2]) =>
      updateFormField(formId, fieldId, payload),
    onSuccess: (updated) => {
      onFieldUpdated(updated)
      qc.invalidateQueries({ queryKey: ['forms', formId] })
    },
    onError: () => toast.error('Failed to update dependency'),
  })

  function toggleSelect(id: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() { setSelected(new Set(visible.map(f => f.id))) }
  function clearAll() { setSelected(new Set()) }

  function applyBulk() {
    const targetFormId = bulkFormId === 'none' ? null : Number(bulkFormId)
    selected.forEach(fieldId => {
      updateMutation.mutate({
        fieldId,
        lockedUntilFormId: targetFormId ?? 0,
        lockScope: bulkScope,
      })
    })
    setSelected(new Set())
    toast.success(`Updated ${selected.size} field${selected.size !== 1 ? 's' : ''}`)
  }

  return (
    <div className="space-y-4">
      {otherForms.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-sm text-muted-foreground">
            No other forms exist yet. Create additional forms to set up dependencies.
          </p>
        </div>
      ) : (
        <>
          {/* Bulk actions */}
          <div className="rounded-md border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Bulk Set Dependency</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                  Clear
                </Button>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="space-y-1 flex-1">
                <Label className="text-xs text-muted-foreground">Lock until form</Label>
                <Select value={bulkFormId} onValueChange={setBulkFormId}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Remove dependency</SelectItem>
                    {otherForms.map(f => (
                      <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 w-36">
                <Label className="text-xs text-muted-foreground">Scope</Label>
                <Select value={bulkScope} onValueChange={v => setBulkScope(v as LockScope)}>
                  <SelectTrigger className="h-7 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Field">Field only</SelectItem>
                    <SelectItem value="EntireForm">Entire form</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="h-7"
                disabled={selected.size === 0 || updateMutation.isPending}
                onClick={applyBulk}
              >
                Apply to {selected.size > 0 ? `${selected.size} field${selected.size !== 1 ? 's' : ''}` : 'selected'}
              </Button>
            </div>
          </div>

          {/* Field list */}
          <div className="rounded-md border divide-y">
            {visible.map(field => (
              <div key={field.id} className="flex items-center gap-3 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(field.id)}
                  onChange={() => toggleSelect(field.id)}
                  className="h-4 w-4 rounded"
                />
                <FormFieldTypeIcon type={field.fieldType} className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-sm flex-1">{field.label}</span>
                <div className="flex items-center gap-2">
                  {field.lockedUntilFormId ? (
                    <div className="flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs text-muted-foreground">
                        Until: <span className="font-medium">{field.lockedUntilFormName}</span>
                      </span>
                      <Badge variant="outline" className="text-xs py-0">
                        {field.lockScope === 'EntireForm' ? 'Entire form' : 'Field only'}
                      </Badge>
                      <button
                        className="text-muted-foreground hover:text-foreground ml-1"
                        onClick={() => updateMutation.mutate({
                          fieldId: field.id,
                          lockedUntilFormId: 0,
                        })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Unlock className="h-3.5 w-3.5" />
                      No dependency
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FormEditorPage() {
  const { formId } = useParams<{ formId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const id = Number(formId)

  const [localFields, setLocalFields] = useState<FormFieldDto[]>([])
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null)
  const [addingField, setAddingField] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('Text')
  const [previewMode, setPreviewMode] = useState(false)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: form, isLoading } = useQuery({
    queryKey: ['forms', id],
    queryFn: () => getForm(id),
    enabled: !isNaN(id),
  })

  const { data: allForms = [] } = useQuery({
    queryKey: ['forms'],
    queryFn: getForms,
  })

  useEffect(() => {
    if (form) setLocalFields(form.fields.filter(f => !f.isArchived))
  }, [form])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // ── Mutations ────────────────────────────────────────────────────────────

  const addFieldMutation = useMutation({
    mutationFn: (label: string) => createFormField(id, {
      label,
      fieldType: newFieldType,
      isRequired: false,
      sortOrder: localFields.length + 1,
      dataSourceType: 'None',
    }),
    onSuccess: (newField) => {
      setLocalFields(prev => [...prev, newField])
      qc.invalidateQueries({ queryKey: ['forms', id] })
      qc.invalidateQueries({ queryKey: ['forms'] })
      setAddingField(false)
      setNewFieldLabel('')
      setNewFieldType('Text')
      setSelectedFieldId(newField.id)
      toast.success('Field added')
    },
    onError: () => toast.error('Failed to add field'),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: (fieldId: number) => deleteFormField(id, fieldId),
    onSuccess: (_, fieldId) => {
      setLocalFields(prev => prev.filter(f => f.id !== fieldId))
      if (selectedFieldId === fieldId) setSelectedFieldId(null)
      qc.invalidateQueries({ queryKey: ['forms', id] })
      qc.invalidateQueries({ queryKey: ['forms'] })
    },
    onError: () => toast.error('Failed to delete field'),
  })

  const reorderMutation = useMutation({
    mutationFn: (fieldIds: number[]) => reorderFormFields(id, fieldIds),
  })

  const statusMutation = useMutation({
    mutationFn: (status: FormStatus) => updateFormStatus(id, status),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['forms', id] })
      qc.invalidateQueries({ queryKey: ['forms'] })
      const labels: Record<FormStatus, string> = {
        Draft: 'Reverted to draft',
        Unlocked: form?.status === 'Draft' ? 'Published — import template created' : 'Unlocked for editing',
        Locked: 'Form locked',
      }
      toast.success(labels[updated.status])
    },
    onError: () => toast.error('Failed to update form status'),
  })

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = localFields.findIndex(f => f.id === active.id)
    const newIdx = localFields.findIndex(f => f.id === over.id)
    const reordered = arrayMove(localFields, oldIdx, newIdx)
    setLocalFields(reordered)
    reorderMutation.mutate(reordered.map(f => f.id))
  }

  function handleFieldSaved(updated: FormFieldDto) {
    setLocalFields(prev => prev.map(f => f.id === updated.id ? updated : f))
    qc.invalidateQueries({ queryKey: ['forms', id] })
    qc.invalidateQueries({ queryKey: ['forms'] })
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-4 h-96">
          <Skeleton className="w-72 h-full" />
          <Skeleton className="flex-1 h-full" />
        </div>
      </div>
    )
  }

  if (!form) return <div className="p-6 text-muted-foreground">Form not found.</div>

  const isLocked = form.status === 'Locked'
  const selectedField = localFields.find(f => f.id === selectedFieldId) ?? null
  const otherFormsList = allForms
    .filter(f => f.id !== id)
    .map(f => ({ id: f.id, name: f.name }))

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/settings/forms')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold truncate">{form.name}</h1>
            {/* Status badge */}
            {form.status === 'Draft' && (
              <Badge variant="secondary" className="text-xs shrink-0">Draft</Badge>
            )}
            {form.status === 'Unlocked' && (
              <Badge className="text-xs shrink-0 bg-blue-600 hover:bg-blue-600">Unlocked</Badge>
            )}
            {form.status === 'Locked' && (
              <Badge className="text-xs shrink-0 bg-red-600 hover:bg-red-600 gap-1">
                <Lock className="h-2.5 w-2.5" /> Locked
              </Badge>
            )}
          </div>
          {form.description && (
            <p className="text-xs text-muted-foreground truncate">{form.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Status transition buttons */}
          {form.status === 'Draft' && (
            <Button
              size="sm" variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirm('Publish this form? An import template will be created automatically.'))
                  statusMutation.mutate('Unlocked')
              }}
            >
              <Unlock className="h-3.5 w-3.5 mr-1.5" />
              Publish
            </Button>
          )}
          {form.status === 'Unlocked' && (
            <Button
              size="sm" variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirm('Lock this form? It will become read-only.'))
                  statusMutation.mutate('Locked')
              }}
            >
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Lock
            </Button>
          )}
          {form.status === 'Locked' && (
            <Button
              size="sm" variant="outline"
              disabled={statusMutation.isPending}
              onClick={() => {
                if (confirm('Unlock this form for editing? Any subsequent changes will be queued to notify active projects at 3 AM EST.'))
                  statusMutation.mutate('Unlocked')
              }}
            >
              <LockOpen className="h-3.5 w-3.5 mr-1.5" />
              Unlock
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(p => !p)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* ── Left: field list + tabs ─────────────────────────────────── */}
        {!previewMode && (
          <div className="w-80 shrink-0 border-r flex flex-col">
            <Tabs defaultValue="fields" className="flex flex-col flex-1 min-h-0">
              <TabsList className="mx-3 mt-3 mb-0 shrink-0">
                <TabsTrigger value="fields" className="flex-1">Fields</TabsTrigger>
                <TabsTrigger value="dependencies" className="flex-1">Dependencies</TabsTrigger>
              </TabsList>

              {/* Fields tab */}
              <TabsContent value="fields" className="flex flex-col flex-1 min-h-0 mt-0 p-3 space-y-2 overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localFields.map(f => f.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {localFields.map(field => (
                        <div key={field.id}>
                          <SortableFieldCard
                            field={field}
                            isSelected={selectedFieldId === field.id}
                            onSelect={() => setSelectedFieldId(
                              selectedFieldId === field.id ? null : field.id
                            )}
                            onDelete={() => deleteFieldMutation.mutate(field.id)}
                            isDeletePending={deleteFieldMutation.isPending}
                          />
                          {selectedFieldId === field.id && (
                            <div className="mt-1.5">
                              <FieldConfigPanel
                                field={field}
                                allForms={otherFormsList}
                                formId={id}
                                onSaved={handleFieldSaved}
                                onClose={() => setSelectedFieldId(null)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>

                {localFields.length === 0 && !addingField && (
                  <div className="text-center py-4">
                    <p className="text-xs text-muted-foreground">
                      {isLocked ? 'Form is locked — unlock to edit fields.' : 'No fields yet. Add one below.'}
                    </p>
                  </div>
                )}

                {/* Add field inline — hidden when locked */}
                {isLocked ? null : addingField ? (
                  <div className="border rounded-md p-2.5 space-y-2 bg-muted/30">
                    <Input
                      value={newFieldLabel}
                      onChange={e => setNewFieldLabel(e.target.value)}
                      placeholder="Field label..."
                      className="h-7 text-sm"
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newFieldLabel.trim())
                          addFieldMutation.mutate(newFieldLabel.trim())
                        if (e.key === 'Escape') {
                          setAddingField(false)
                          setNewFieldLabel('')
                        }
                      }}
                    />
                    <Select value={newFieldType} onValueChange={v => setNewFieldType(v as FieldType)}>
                      <SelectTrigger className="h-7 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FIELD_TYPES.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        className="flex-1 h-7"
                        onClick={() => newFieldLabel.trim() && addFieldMutation.mutate(newFieldLabel.trim())}
                        disabled={!newFieldLabel.trim() || addFieldMutation.isPending}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7"
                        onClick={() => { setAddingField(false); setNewFieldLabel('') }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setAddingField(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Field
                  </Button>
                )}
              </TabsContent>

              {/* Dependencies tab */}
              <TabsContent value="dependencies" className="flex-1 overflow-y-auto p-3 mt-0">
                <DependenciesTab
                  fields={localFields}
                  allForms={otherFormsList}
                  formId={id}
                  onFieldUpdated={handleFieldSaved}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* ── Right: live preview ──────────────────────────────────────── */}
        <div className={`flex-1 flex flex-col p-4 min-h-0 overflow-y-auto ${previewMode ? 'max-w-2xl mx-auto w-full' : ''}`}>
          {previewMode && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{form.name}</h2>
              {form.description && (
                <p className="text-sm text-muted-foreground">{form.description}</p>
              )}
            </div>
          )}
          <FormPreview fields={localFields} />
        </div>
      </div>
    </div>
  )
}
