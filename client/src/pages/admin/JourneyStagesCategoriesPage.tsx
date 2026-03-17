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
  getJourneyStageCategories, getJourneyStageCategory,
  createJourneyStageCategory, updateJourneyStageCategory, deleteJourneyStageCategory,
} from '@/api/journeyStageCategories'
import type { JourneyStageCategoryDto, CreateJourneyStageCategoryPayload } from '@/api/journeyStageCategories'

export default function JourneyStagesCategoriesPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateJourneyStageCategoryPayload>({ name: '', description: '', sortOrder: 0 })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '' })

  // --- Queries ---
  const { data: categories, isLoading: categoriesLoading } = useQuery<JourneyStageCategoryDto[]>({
    queryKey: ['journey-stage-categories'],
    queryFn: getJourneyStageCategories,
  })

  const { data: selected, isLoading: selectedLoading } = useQuery<JourneyStageCategoryDto>({
    queryKey: ['journey-stage-categories', selectedId],
    queryFn: () => getJourneyStageCategory(selectedId!),
    enabled: selectedId !== null,
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createJourneyStageCategory,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['journey-stage-categories'] })
      toast.success('Stage category created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', sortOrder: 0 })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create stage category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateJourneyStageCategory>[1]) =>
      updateJourneyStageCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-stage-categories'] })
      queryClient.invalidateQueries({ queryKey: ['journey-stage-categories', selectedId] })
      setEditingHeader(false)
      toast.success('Stage category updated')
    },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteJourneyStageCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journey-stage-categories'] })
      setSelectedId(null)
      toast.success('Stage category deleted')
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg ?? 'Failed to delete — category may be in use')
    },
  })

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.name.trim()) { toast.error('Name is required'); return }
    createMutation.mutate(sheetForm)
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Stage Categories</h1>
        <p className="text-sm text-muted-foreground">Define the categories used to classify stages within journeys</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            onClick={() => {
              setSheetForm({ name: '', description: '', sortOrder: 0 })
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Stage Category
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {categoriesLoading ? (
              <div className="space-y-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !categories || categories.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No stage categories yet.</div>
            ) : (
              categories.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${selectedId === c.id ? 'bg-muted' : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    {!c.isActive && (
                      <Badge variant="secondary" className="text-xs shrink-0">Inactive</Badge>
                    )}
                  </div>
                  {c.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{c.description}</p>
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
              <p className="text-sm text-muted-foreground">Select a stage category to view details</p>
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
                    <div className="space-y-2 pb-2 border-b">
                      <Input
                        className="text-lg font-semibold h-9"
                        value={headerForm.name}
                        onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Category name"
                        autoFocus
                      />
                      <Input
                        className="text-sm"
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
                            setHeaderForm({ name: selected.name, description: selected.description ?? '' })
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
                      {selected.description
                        ? <p className="text-sm text-muted-foreground">{selected.description}</p>
                        : <p className="text-xs text-muted-foreground italic">No description — hover and click edit to add one</p>
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
                        Active — available to assign to journey stages
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
            <SheetTitle>New Stage Category</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="sc-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="sc-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Onboarding"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-description">Description</Label>
              <Input
                id="sc-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-sort-order">Sort Order</Label>
              <Input
                id="sc-sort-order"
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
