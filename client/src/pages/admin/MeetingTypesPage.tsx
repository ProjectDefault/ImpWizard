import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMeetingTypes, getMeetingType,
  createMeetingType, updateMeetingType, deleteMeetingType,
} from '@/api/meetingTypes'
import type { MeetingTypeDto, CreateMeetingTypePayload } from '@/api/meetingTypes'

export default function MeetingTypesPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateMeetingTypePayload>({ name: '', sortOrder: 0 })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', sortOrder: '' })

  // --- Queries ---
  const { data: types, isLoading: typesLoading } = useQuery<MeetingTypeDto[]>({
    queryKey: ['meeting-types'],
    queryFn: getMeetingTypes,
  })

  const { data: selected, isLoading: selectedLoading } = useQuery<MeetingTypeDto>({
    queryKey: ['meeting-types', selectedId],
    queryFn: () => getMeetingType(selectedId!),
    enabled: selectedId !== null,
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createMeetingType,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] })
      toast.success('Meeting type created')
      setSheetOpen(false)
      setSheetForm({ name: '', sortOrder: 0 })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create meeting type'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateMeetingType>[1]) =>
      updateMeetingType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] })
      queryClient.invalidateQueries({ queryKey: ['meeting-types', selectedId] })
      setEditingHeader(false)
      toast.success('Meeting type updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeetingType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-types'] })
      setSelectedId(null)
      toast.success('Meeting type deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.name?.trim()) { toast.error('Name is required'); return }
    createMutation.mutate({ ...sheetForm, name: sheetForm.name.trim() })
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Meeting Types</h1>
        <p className="text-sm text-muted-foreground">Manage the list of meeting types available for selection in journeys and catalog entries</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            onClick={() => {
              setSheetForm({ name: '', sortOrder: 0 })
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Meeting Type
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {typesLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : !types || types.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No meeting types yet.</div>
            ) : (
              types.map((t) => (
                <div
                  key={t.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedId === t.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    {!t.isActive && (
                      <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a meeting type to view details</p>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {selectedLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ) : selected ? (
                <>
                  {editingHeader ? (
                    <div className="space-y-3 pb-2 border-b">
                      <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input
                          value={headerForm.name}
                          onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="Meeting type name"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Sort Order</Label>
                        <Input
                          type="number"
                          value={headerForm.sortOrder}
                          onChange={e => setHeaderForm(f => ({ ...f, sortOrder: e.target.value }))}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!headerForm.name.trim() || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({
                            id: selected.id,
                            name: headerForm.name.trim(),
                            sortOrder: Number(headerForm.sortOrder),
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
                        <h2 className="text-xl font-semibold">{selected.name}</h2>
                        {!selected.isActive && <Badge variant="secondary">Inactive</Badge>}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setHeaderForm({
                              name: selected.name,
                              sortOrder: String(selected.sortOrder),
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
                            if (confirm(`Delete "${selected.name}"? This cannot be undone.`)) {
                              deleteMutation.mutate(selected.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">Sort order: {selected.sortOrder}</p>
                    </div>
                  )}

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
                        Active — available for selection in journeys and catalog entries
                      </Label>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* New Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Meeting Type</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="mt-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="mt-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Kickoff"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mt-sort">Sort Order</Label>
              <Input
                id="mt-sort"
                type="number"
                value={sheetForm.sortOrder ?? 0}
                onChange={e => setSheetForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
              />
            </div>
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
    </div>
  )
}
