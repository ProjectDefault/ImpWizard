import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Plus, Pencil, Copy, Trash2, Check, X,
  ClipboardList, ChevronRight, Lock, Unlock, LockOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getForms, getForm, createForm, updateForm, deleteForm, duplicateForm, updateFormStatus,
} from '@/api/forms'
import type { CreateFormPayload, FormStatus } from '@/api/forms'
import { FormFieldTypeBadge } from '@/components/forms/FormFieldTypeBadge'
import { FormFieldTypeIcon } from '@/components/forms/FormFieldTypeIcon'
import ProgramSelect from '@/components/shared/ProgramSelect'

function StatusBadge({ status }: { status: FormStatus }) {
  if (status === 'Draft')
    return <Badge variant="secondary" className="text-xs px-1.5 py-0 gap-0.5">Draft</Badge>
  if (status === 'Unlocked')
    return <Badge className="text-xs px-1.5 py-0 gap-0.5 bg-blue-600 hover:bg-blue-600">Unlocked</Badge>
  return (
    <Badge className="text-xs px-1.5 py-0 gap-0.5 bg-red-600 hover:bg-red-600">
      <Lock className="h-2.5 w-2.5" /> Locked
    </Badge>
  )
}

export default function FormsPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateFormPayload>({ name: '', description: '', sortOrder: 0 })
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '' })

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: forms = [], isLoading: formsLoading } = useQuery({
    queryKey: ['forms'],
    queryFn: getForms,
  })

  const { data: selected, isLoading: selectedLoading } = useQuery({
    queryKey: ['forms', selectedId],
    queryFn: () => getForm(selectedId!),
    enabled: selectedId !== null,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createForm,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      toast.success('Form created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', sortOrder: 0 })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create form'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateForm>[1]) =>
      updateForm(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      qc.invalidateQueries({ queryKey: ['forms', selectedId] })
      setEditingHeader(false)
      toast.success('Form updated')
    },
    onError: () => toast.error('Failed to update form'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateForm(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      qc.invalidateQueries({ queryKey: ['forms', selectedId] })
    },
    onError: () => toast.error('Failed to update status'),
  })

  const toggleFileSubmissionMutation = useMutation({
    mutationFn: ({ id, allowFileSubmission }: { id: number; allowFileSubmission: boolean }) =>
      updateForm(id, { allowFileSubmission }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      qc.invalidateQueries({ queryKey: ['forms', selectedId] })
    },
    onError: () => toast.error('Failed to update file submission setting'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteForm,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      setSelectedId(null)
      toast.success('Form deleted')
    },
    onError: () => toast.error('Failed to delete form'),
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateForm,
    onSuccess: (copy) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      setSelectedId(copy.id)
      toast.success('Form duplicated')
    },
    onError: () => toast.error('Failed to duplicate form'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: FormStatus }) =>
      updateFormStatus(id, status),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['forms'] })
      qc.invalidateQueries({ queryKey: ['forms', selectedId] })
      const labels: Record<FormStatus, string> = {
        Draft: 'Draft',
        Unlocked: 'Unlocked — import template created',
        Locked: 'Form locked',
      }
      toast.success(labels[updated.status])
    },
    onError: () => toast.error('Failed to update form status'),
  })

  const visibleFields = selected?.fields.filter(f => !f.isArchived) ?? []
  const dependencyCount = visibleFields.filter(f => f.lockedUntilFormId).length

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Forms</h1>
        <p className="text-sm text-muted-foreground">
          Build intake forms for collecting project data
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button size="sm" onClick={() => {
            setSheetForm({ name: '', description: '', sortOrder: 0 })
            setSheetOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" />
            New Form
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {formsLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : forms.length === 0 ? (
              <div className="p-6 text-center">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No forms yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Create one to get started.</p>
              </div>
            ) : (
              forms.map(f => (
                <div
                  key={f.id}
                  onClick={() => setSelectedId(f.id)}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                    selectedId === f.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{f.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={f.status} />
                      {!f.isActive && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  {f.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{f.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <div className="text-center">
                <ClipboardList className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a form to view its details</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {selectedLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : selected ? (
                <>
                  {/* Header */}
                  {editingHeader ? (
                    <div className="space-y-2 pb-3 border-b">
                      <Input
                        className="text-lg font-semibold h-9"
                        value={headerForm.name}
                        onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Form name"
                        autoFocus
                      />
                      <Textarea
                        className="text-sm resize-none"
                        rows={2}
                        value={headerForm.description}
                        onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!headerForm.name.trim() || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({
                            id: selected.id,
                            name: headerForm.name.trim(),
                            description: headerForm.description.trim() || undefined,
                          })}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingHeader(false)}>
                          <X className="h-3.5 w-3.5 mr-1" />Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 group pb-3 border-b">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-semibold truncate">{selected.name}</h2>
                            <StatusBadge status={selected.status} />
                            {!selected.isActive && (
                              <Badge variant="secondary" className="shrink-0">Inactive</Badge>
                            )}
                          </div>
                          {selected.description
                            ? <p className="text-sm text-muted-foreground mt-0.5">{selected.description}</p>
                            : <p className="text-xs text-muted-foreground italic mt-0.5">No description</p>
                          }
                        </div>
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => {
                              setHeaderForm({ name: selected.name, description: selected.description ?? '' })
                              setEditingHeader(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => duplicateMutation.mutate(selected.id)}
                            disabled={duplicateMutation.isPending}
                            title="Duplicate form"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => {
                              if (confirm(`Delete "${selected.name}"? This cannot be undone.`))
                                deleteMutation.mutate(selected.id)
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {/* Active toggle + Open Editor */}
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id="form-active"
                              checked={selected.isActive}
                              onCheckedChange={checked =>
                                toggleActiveMutation.mutate({ id: selected.id, isActive: checked })
                              }
                              disabled={toggleActiveMutation.isPending}
                            />
                            <Label htmlFor="form-active" className="text-sm cursor-pointer">Active</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id="form-file-submission"
                              checked={selected.allowFileSubmission}
                              onCheckedChange={checked =>
                                toggleFileSubmissionMutation.mutate({ id: selected.id, allowFileSubmission: checked })
                              }
                              disabled={toggleFileSubmissionMutation.isPending}
                            />
                            <Label htmlFor="form-file-submission" className="text-sm cursor-pointer">Allow File Submission</Label>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/admin/settings/forms/${selected.id}/edit`)}
                        >
                          Open Editor
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>

                      {/* Status transition */}
                      <div className="flex items-center gap-2 pt-1">
                        {selected.status === 'Draft' && (
                          <Button
                            size="sm" variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              if (confirm('Publish this form? An import template will be created automatically.'))
                                statusMutation.mutate({ id: selected.id, status: 'Unlocked' })
                            }}
                          >
                            <Unlock className="h-3.5 w-3.5 mr-1.5" />
                            Publish (Unlock)
                          </Button>
                        )}
                        {selected.status === 'Unlocked' && (
                          <Button
                            size="sm" variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              if (confirm('Lock this form? It will become read-only.'))
                                statusMutation.mutate({ id: selected.id, status: 'Locked' })
                            }}
                          >
                            <Lock className="h-3.5 w-3.5 mr-1.5" />
                            Lock Form
                          </Button>
                        )}
                        {selected.status === 'Locked' && (
                          <Button
                            size="sm" variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => {
                              if (confirm('Unlock this form for editing? Any changes will be queued to notify active projects at 3 AM EST.'))
                                statusMutation.mutate({ id: selected.id, status: 'Unlocked' })
                            }}
                          >
                            <LockOpen className="h-3.5 w-3.5 mr-1.5" />
                            Unlock for Editing
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Program assignment */}
                  {!editingHeader && (
                    <div className="border-t pt-3">
                      <ProgramSelect
                        value={selected.programId}
                        onChange={pid => updateMutation.mutate({ id: selected.id, programId: pid })}
                      />
                    </div>
                  )}

                  {/* Field summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">
                        Fields
                        <span className="text-muted-foreground font-normal ml-1.5">
                          ({visibleFields.length})
                        </span>
                      </h3>
                      {dependencyCount > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          {dependencyCount} with dependencies
                        </div>
                      )}
                    </div>

                    {visibleFields.length === 0 ? (
                      <div className="rounded-md border border-dashed p-4 text-center">
                        <p className="text-sm text-muted-foreground">No fields yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Open the editor to add fields.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-md border divide-y">
                        {visibleFields.map((field) => (
                          <div key={field.id} className="flex items-center gap-3 px-3 py-2">
                            <FormFieldTypeIcon
                              type={field.fieldType}
                              className="h-3.5 w-3.5 text-muted-foreground shrink-0"
                            />
                            <span className="text-sm flex-1 truncate">{field.label}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {field.isRequired && (
                                <span className="text-xs text-destructive font-medium">Required</span>
                              )}
                              {field.lockedUntilFormId && (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              )}
                              <FormFieldTypeBadge type={field.fieldType} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {visibleFields.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => navigate(`/admin/settings/forms/${selected.id}/edit`)}
                      >
                        <Pencil className="h-3.5 w-3.5 mr-1.5" />
                        Edit Fields in Editor
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* New Form Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Form</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!sheetForm.name.trim()) { toast.error('Name is required'); return }
              createMutation.mutate(sheetForm)
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="form-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="form-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Equipment Intake Form"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="form-description">Description</Label>
              <Textarea
                id="form-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What data does this form collect?"
                rows={3}
                className="resize-none"
              />
            </div>
            <ProgramSelect
              value={sheetForm.programId ?? null}
              onChange={pid => setSheetForm(p => ({ ...p, programId: pid ?? undefined }))}
            />
            <SheetFooter className="pt-2">
              <Button
                type="button" variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Form'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
