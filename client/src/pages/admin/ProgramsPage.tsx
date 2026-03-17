import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Check, X, UserPlus, UserMinus, Layers } from 'lucide-react'
import { toast } from 'sonner'
import {
  getPrograms,
  getProgramDetail,
  createProgram,
  updateProgram,
  deleteProgram,
  assignUserToProgram,
  removeUserFromProgram,
  getProgramEligibleUsers,
} from '@/api/programs'
import type { ProgramDto, CreateProgramPayload } from '@/api/programs'

const PRESET_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1',
]

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <div className="h-3 w-3 rounded-full bg-muted-foreground/30 shrink-0" />
  return <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>Color</Label>
      <div className="flex flex-wrap gap-2 items-center">
        {PRESET_COLORS.map(c => (
          <button
            key={c}
            type="button"
            className={`h-6 w-6 rounded-full transition-all ${value === c ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'hover:scale-105'}`}
            style={{ backgroundColor: c }}
            onClick={() => onChange(c)}
          />
        ))}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="color"
            value={value || '#3b82f6'}
            onChange={e => onChange(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border-0 p-0 bg-transparent"
            title="Custom color"
          />
          <span className="text-xs text-muted-foreground font-mono">{value || '—'}</span>
        </div>
      </div>
    </div>
  )
}

export default function ProgramsPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateProgramPayload>({ name: '', description: '', color: PRESET_COLORS[0] })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '', color: '' })

  const [userDialogOpen, setUserDialogOpen] = useState(false)

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ['programs'],
    queryFn: getPrograms,
  })

  const { data: selected, isLoading: selectedLoading } = useQuery({
    queryKey: ['programs', selectedId],
    queryFn: () => getProgramDetail(selectedId!),
    enabled: selectedId !== null,
  })

  const { data: eligibleUsers, isLoading: eligibleLoading } = useQuery({
    queryKey: ['programs', selectedId, 'eligible-users'],
    queryFn: () => getProgramEligibleUsers(selectedId!),
    enabled: userDialogOpen && selectedId !== null,
  })

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createProgram,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      toast.success('Program created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', color: PRESET_COLORS[0] })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create program'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateProgram>[1]) =>
      updateProgram(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      queryClient.invalidateQueries({ queryKey: ['programs', selectedId] })
      setEditingHeader(false)
      toast.success('Program updated')
    },
    onError: () => toast.error('Failed to update program'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProgram,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] })
      setSelectedId(null)
      toast.success('Program deleted')
    },
    onError: () => toast.error('Failed to delete program'),
  })

  const assignUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      assignUserToProgram(selectedId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['programs', selectedId, 'eligible-users'] })
      toast.success('User restricted to program')
    },
    onError: () => toast.error('Failed to assign user'),
  })

  const removeUserMutation = useMutation({
    mutationFn: ({ userId }: { userId: string }) =>
      removeUserFromProgram(selectedId!, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['programs', selectedId, 'eligible-users'] })
      toast.success('User restriction removed')
    },
    onError: () => toast.error('Failed to remove user'),
  })

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSheetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sheetForm.name.trim()) { toast.error('Name is required'); return }
    createMutation.mutate(sheetForm)
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Programs</h1>
        <p className="text-sm text-muted-foreground">
          Organize implementation types, forms, templates, and projects by program. Restrict CIS users to specific programs.
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel — program list */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            onClick={() => {
              setSheetForm({ name: '', description: '', color: PRESET_COLORS[0] })
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Program
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {programsLoading ? (
              <div className="space-y-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !programs || programs.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No programs yet.</div>
            ) : (
              programs.map((p: ProgramDto) => (
                <div
                  key={p.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedId === p.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <div className="flex items-center gap-2">
                    <ColorDot color={p.color} />
                    <span className="text-sm font-medium truncate flex-1">{p.name}</span>
                    {!p.isActive && (
                      <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
                    )}
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5 pl-5">{p.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel — program detail */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a program to view details</p>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {selectedLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                </div>
              ) : selected ? (
                <>
                  {/* Header */}
                  {editingHeader ? (
                    <div className="space-y-3 pb-3 border-b">
                      <Input
                        className="text-lg font-semibold h-9"
                        value={headerForm.name}
                        onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Program name"
                        autoFocus
                      />
                      <Input
                        className="text-sm"
                        value={headerForm.description}
                        onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description (optional)"
                      />
                      <ColorPicker
                        value={headerForm.color}
                        onChange={c => setHeaderForm(f => ({ ...f, color: c }))}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!headerForm.name.trim() || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({
                            id: selected.id,
                            name: headerForm.name.trim(),
                            description: headerForm.description.trim() || undefined,
                            color: headerForm.color || undefined,
                          })}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingHeader(false)}>
                          <X className="h-3.5 w-3.5 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1 group relative">
                      <div className="flex items-center gap-2">
                        <ColorDot color={selected.color} />
                        <h2 className="text-xl font-semibold">{selected.name}</h2>
                        {!selected.isActive && <Badge variant="secondary">Inactive</Badge>}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setHeaderForm({
                              name: selected.name,
                              description: selected.description ?? '',
                              color: selected.color ?? PRESET_COLORS[0],
                            })
                            setEditingHeader(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (confirm(`Delete program "${selected.name}"? This will unassign all linked items but not delete them.`)) {
                              deleteMutation.mutate(selected.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      {selected.description
                        ? <p className="text-sm text-muted-foreground pl-5">{selected.description}</p>
                        : <p className="text-xs text-muted-foreground italic pl-5">No description</p>
                      }
                    </div>
                  )}

                  {/* Active toggle */}
                  {!editingHeader && (
                    <div className="flex items-center gap-3 py-2 border-t">
                      <Switch
                        id="active-toggle"
                        checked={selected.isActive}
                        onCheckedChange={checked =>
                          updateMutation.mutate({ id: selected.id, isActive: checked })
                        }
                        disabled={updateMutation.isPending}
                      />
                      <Label htmlFor="active-toggle" className="text-sm cursor-pointer">
                        Active — visible when assigning to projects and journeys
                      </Label>
                    </div>
                  )}

                  {/* Assigned items summary */}
                  <div className="border-t pt-3 space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <Layers className="h-4 w-4" />
                      Assigned Items
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { label: 'Implementation Types', count: selected.implementationTypeCount },
                        { label: 'Forms', count: selected.formCount },
                        { label: 'Import Templates', count: selected.importTemplateCount },
                        { label: 'Projects', count: selected.projectCount },
                      ].map(item => (
                        <div key={item.label} className="rounded-md border p-2.5 text-center">
                          <div className="text-2xl font-semibold">{item.count}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CIS User Access Restrictions */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium">CIS User Restrictions</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          CIS users listed here are restricted to <em>only</em> this program's journeys and projects.
                          Users with no program restrictions have full access.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setUserDialogOpen(true)}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Manage
                      </Button>
                    </div>

                    {selected.restrictedUsers.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic py-2">
                        No CIS users are restricted to this program — all CIS users can see it.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {selected.restrictedUsers.map(u => (
                          <div key={u.userId} className="flex items-center justify-between rounded-md border px-3 py-2">
                            <div>
                              <div className="text-sm font-medium">{u.fullName}</div>
                              <div className="text-xs text-muted-foreground">{u.email}</div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              disabled={removeUserMutation.isPending}
                              onClick={() => {
                                if (confirm(`Remove restriction for ${u.fullName}? They will regain access to all programs (or be limited by other program restrictions).`)) {
                                  removeUserMutation.mutate({ userId: u.userId })
                                }
                              }}
                            >
                              <UserMinus className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Create Program Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Program</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="prog-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="prog-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Brewery Onboarding"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prog-description">Description</Label>
              <Input
                id="prog-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <ColorPicker
              value={sheetForm.color ?? PRESET_COLORS[0]}
              onChange={c => setSheetForm(p => ({ ...p, color: c }))}
            />
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Manage Users Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage CIS Restrictions — {selected?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-xs text-muted-foreground">
              Restrict CIS users to only this program's journeys and projects. A CIS user with any
              program restrictions can only access those specific programs.
            </p>
            <Separator />
            {eligibleLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : !eligibleUsers || eligibleUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No CIS users found.</p>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {eligibleUsers.map(u => (
                  <div key={u.userId} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{u.fullName}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </div>
                    {u.isAssigned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive hover:bg-destructive/10"
                        disabled={removeUserMutation.isPending}
                        onClick={() => removeUserMutation.mutate({ userId: u.userId })}
                      >
                        <UserMinus className="h-3.5 w-3.5 mr-1" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={assignUserMutation.isPending}
                        onClick={() => assignUserMutation.mutate({ userId: u.userId })}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Restrict
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
