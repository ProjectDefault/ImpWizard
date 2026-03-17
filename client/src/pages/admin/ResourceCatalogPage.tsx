import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getResourceCatalog, getResourceCatalogEntry,
  createResourceCatalogEntry, updateResourceCatalogEntry, deleteResourceCatalogEntry,
} from '@/api/resourceCatalog'
import type { ResourceCatalogEntryDto, CreateResourceCatalogPayload } from '@/api/resourceCatalog'
import { getResourceTypes } from '@/api/resourceTypes'
import type { ResourceTypeDto } from '@/api/resourceTypes'

export default function ResourceCatalogPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateResourceCatalogPayload>({
    title: '', resourceType: '', resourceUrl: '', resourceLabel: '', description: '', sortOrder: 0,
  })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({
    title: '', resourceType: '', resourceUrl: '', resourceLabel: '', description: '',
  })

  // --- Queries ---
  const { data: resourceTypes = [] } = useQuery<ResourceTypeDto[]>({
    queryKey: ['resource-types'],
    queryFn: getResourceTypes,
  })

  const { data: entries, isLoading: entriesLoading } = useQuery<ResourceCatalogEntryDto[]>({
    queryKey: ['resource-catalog'],
    queryFn: getResourceCatalog,
  })

  const { data: selected, isLoading: selectedLoading } = useQuery<ResourceCatalogEntryDto>({
    queryKey: ['resource-catalog', selectedId],
    queryFn: () => getResourceCatalogEntry(selectedId!),
    enabled: selectedId !== null,
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createResourceCatalogEntry,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['resource-catalog'] })
      toast.success('Resource catalog entry created')
      setSheetOpen(false)
      setSheetForm({ title: '', resourceType: '', resourceUrl: '', resourceLabel: '', description: '', sortOrder: 0 })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create entry'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateResourceCatalogEntry>[1]) =>
      updateResourceCatalogEntry(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['resource-catalog', selectedId] })
      setEditingHeader(false)
      toast.success('Entry updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteResourceCatalogEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-catalog'] })
      setSelectedId(null)
      toast.success('Entry deleted')
    },
    onError: () => toast.error('Failed to delete'),
  })

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.title?.trim()) { toast.error('Title is required'); return }
    createMutation.mutate({ ...sheetForm, title: sheetForm.title.trim() })
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Resource Catalog</h1>
        <p className="text-sm text-muted-foreground">Reusable resource templates — pick from this catalog when adding resources to a journey stage</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            onClick={() => {
              setSheetForm({ title: '', resourceType: '', resourceUrl: '', resourceLabel: '', description: '', sortOrder: 0 })
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Resource Entry
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
              <div className="p-4 text-sm text-muted-foreground text-center">No resource catalog entries yet.</div>
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
                  {entry.resourceType && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.resourceType}</p>
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
                          placeholder="Resource title"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Resource Type</Label>
                        <Select
                          value={headerForm.resourceType || ''}
                          onValueChange={v => setHeaderForm(f => ({ ...f, resourceType: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {resourceTypes.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>URL</Label>
                        <Input
                          value={headerForm.resourceUrl}
                          onChange={e => setHeaderForm(f => ({ ...f, resourceUrl: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Link Label</Label>
                        <Input
                          value={headerForm.resourceLabel}
                          onChange={e => setHeaderForm(f => ({ ...f, resourceLabel: e.target.value }))}
                          placeholder="e.g. Open Guide"
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
                            resourceType: headerForm.resourceType || undefined,
                            resourceUrl: headerForm.resourceUrl.trim() || undefined,
                            resourceLabel: headerForm.resourceLabel.trim() || undefined,
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
                              resourceType: selected.resourceType ?? '',
                              resourceUrl: selected.resourceUrl ?? '',
                              resourceLabel: selected.resourceLabel ?? '',
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
                        {selected.resourceType && <p><span className="font-medium">Type:</span> {selected.resourceType}</p>}
                        {selected.resourceUrl && <p><span className="font-medium">URL:</span> <a href={selected.resourceUrl} target="_blank" rel="noreferrer" className="underline truncate">{selected.resourceUrl}</a></p>}
                        {selected.resourceLabel && <p><span className="font-medium">Label:</span> {selected.resourceLabel}</p>}
                        {selected.description && <p className="italic">{selected.description}</p>}
                        {!selected.resourceType && !selected.resourceUrl && !selected.description && (
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
            <SheetTitle>New Resource Catalog Entry</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="rc-title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="rc-title"
                value={sheetForm.title}
                onChange={e => setSheetForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Onboarding Guide"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-type">Resource Type</Label>
              <Select
                value={sheetForm.resourceType || ''}
                onValueChange={v => setSheetForm(p => ({ ...p, resourceType: v || undefined }))}
              >
                <SelectTrigger id="rc-type">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {resourceTypes.filter(t => t.isActive).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-url">URL</Label>
              <Input
                id="rc-url"
                value={sheetForm.resourceUrl ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, resourceUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-label">Link Label</Label>
              <Input
                id="rc-label"
                value={sheetForm.resourceLabel ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, resourceLabel: e.target.value }))}
                placeholder="e.g. Open Guide"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-description">Description</Label>
              <Input
                id="rc-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Internal description (optional)"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rc-sort">Sort Order</Label>
              <Input
                id="rc-sort"
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
