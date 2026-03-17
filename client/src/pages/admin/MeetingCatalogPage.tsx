import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getMeetingCatalog, getMeetingCatalogEntry,
  createMeetingCatalogEntry, updateMeetingCatalogEntry, deleteMeetingCatalogEntry,
} from '@/api/meetingCatalog'
import type { MeetingCatalogEntryDto, CreateMeetingCatalogPayload } from '@/api/meetingCatalog'
import { getMeetingTypes } from '@/api/meetingTypes'
import type { MeetingTypeDto } from '@/api/meetingTypes'

export default function MeetingCatalogPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateMeetingCatalogPayload>({
    title: '', meetingType: '', purpose: '', goals: '', defaultDurationMinutes: undefined, description: '', sortOrder: 0,
  })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({
    title: '', meetingType: '', purpose: '', goals: '', defaultDurationMinutes: '' as string, description: '',
  })

  // --- Queries ---
  const { data: meetingTypes = [] } = useQuery<MeetingTypeDto[]>({
    queryKey: ['meeting-types'],
    queryFn: getMeetingTypes,
  })

  const { data: entries, isLoading: entriesLoading } = useQuery<MeetingCatalogEntryDto[]>({
    queryKey: ['meeting-catalog'],
    queryFn: getMeetingCatalog,
  })

  const { data: selected, isLoading: selectedLoading } = useQuery<MeetingCatalogEntryDto>({
    queryKey: ['meeting-catalog', selectedId],
    queryFn: () => getMeetingCatalogEntry(selectedId!),
    enabled: selectedId !== null,
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createMeetingCatalogEntry,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['meeting-catalog'] })
      toast.success('Meeting catalog entry created')
      setSheetOpen(false)
      setSheetForm({ title: '', meetingType: '', purpose: '', goals: '', defaultDurationMinutes: undefined, description: '', sortOrder: 0 })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create entry'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateMeetingCatalogEntry>[1]) =>
      updateMeetingCatalogEntry(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['meeting-catalog', selectedId] })
      setEditingHeader(false)
      toast.success('Entry updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeetingCatalogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting-catalog'] })
      setSelectedId(null)
      toast.success('Entry deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.title?.trim()) { toast.error('Title is required'); return }
    createMutation.mutate({
      ...sheetForm,
      title: sheetForm.title.trim(),
      defaultDurationMinutes: sheetForm.defaultDurationMinutes || undefined,
    })
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Meeting Catalog</h1>
        <p className="text-sm text-muted-foreground">Reusable meeting templates — pick from this catalog when adding meetings to a journey stage</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            onClick={() => {
              setSheetForm({ title: '', meetingType: '', purpose: '', goals: '', defaultDurationMinutes: undefined, description: '', sortOrder: 0 })
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Meeting Entry
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {entriesLoading ? (
              <div className="space-y-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !entries || entries.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No meeting catalog entries yet.</div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedId === entry.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedId(entry.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{entry.title}</span>
                    {!entry.isActive && (
                      <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
                    )}
                  </div>
                  {entry.meetingType && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.meetingType}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select an entry to view details</p>
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
                    <div className="space-y-3 pb-2 border-b">
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input
                          value={headerForm.title}
                          onChange={e => setHeaderForm(f => ({ ...f, title: e.target.value }))}
                          placeholder="Meeting title"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Meeting Type</Label>
                        <Select
                          value={headerForm.meetingType || ''}
                          onValueChange={v => setHeaderForm(f => ({ ...f, meetingType: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {meetingTypes.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Default Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={headerForm.defaultDurationMinutes}
                          onChange={e => setHeaderForm(f => ({ ...f, defaultDurationMinutes: e.target.value }))}
                          placeholder="e.g. 60"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Purpose</Label>
                        <Textarea
                          value={headerForm.purpose}
                          onChange={e => setHeaderForm(f => ({ ...f, purpose: e.target.value }))}
                          placeholder="Meeting purpose"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Goals</Label>
                        <Textarea
                          value={headerForm.goals}
                          onChange={e => setHeaderForm(f => ({ ...f, goals: e.target.value }))}
                          placeholder="Meeting goals"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Description</Label>
                        <Input
                          value={headerForm.description}
                          onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))}
                          placeholder="Internal description (optional)"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={!headerForm.title.trim() || updateMutation.isPending}
                          onClick={() => updateMutation.mutate({
                            id: selected.id,
                            title: headerForm.title.trim(),
                            meetingType: headerForm.meetingType || undefined,
                            defaultDurationMinutes: headerForm.defaultDurationMinutes ? Number(headerForm.defaultDurationMinutes) : undefined,
                            purpose: headerForm.purpose.trim() || undefined,
                            goals: headerForm.goals.trim() || undefined,
                            description: headerForm.description.trim() || undefined,
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
                        <h2 className="text-xl font-semibold">{selected.title}</h2>
                        {!selected.isActive && <Badge variant="secondary">Inactive</Badge>}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setHeaderForm({
                              title: selected.title,
                              meetingType: selected.meetingType ?? '',
                              defaultDurationMinutes: selected.defaultDurationMinutes?.toString() ?? '',
                              purpose: selected.purpose ?? '',
                              goals: selected.goals ?? '',
                              description: selected.description ?? '',
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
                            if (confirm(`Delete "${selected.title}"? This cannot be undone.`)) {
                              deleteMutation.mutate(selected.id)
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {selected.meetingType && <p><span className="font-medium">Type:</span> {selected.meetingType}</p>}
                        {selected.defaultDurationMinutes && <p><span className="font-medium">Duration:</span> {selected.defaultDurationMinutes} min</p>}
                        {selected.purpose && <p><span className="font-medium">Purpose:</span> {selected.purpose}</p>}
                        {selected.goals && <p><span className="font-medium">Goals:</span> {selected.goals}</p>}
                        {selected.description && <p className="italic">{selected.description}</p>}
                        {!selected.meetingType && !selected.purpose && !selected.goals && !selected.description && (
                          <p className="italic">No details — hover and click edit to add</p>
                        )}
                      </div>
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
                        Active — available to use in the Journey Editor
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
            <SheetTitle>New Meeting Catalog Entry</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="mc-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="mc-title"
                value={sheetForm.title}
                onChange={e => setSheetForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Kickoff Call"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-type">Meeting Type</Label>
              <Select
                value={sheetForm.meetingType || ''}
                onValueChange={v => setSheetForm(p => ({ ...p, meetingType: v || undefined }))}
              >
                <SelectTrigger id="mc-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {meetingTypes.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-duration">Default Duration (minutes)</Label>
              <Input
                id="mc-duration"
                type="number"
                value={sheetForm.defaultDurationMinutes ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, defaultDurationMinutes: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="e.g. 60"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-purpose">Purpose</Label>
              <Textarea
                id="mc-purpose"
                value={sheetForm.purpose ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, purpose: e.target.value }))}
                placeholder="Meeting purpose"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-goals">Goals</Label>
              <Textarea
                id="mc-goals"
                value={sheetForm.goals ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, goals: e.target.value }))}
                placeholder="Meeting goals"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-description">Description</Label>
              <Input
                id="mc-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Internal description (optional)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mc-sort">Sort Order</Label>
              <Input
                id="mc-sort"
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
