import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getCategories, getCategory, createCategory, updateCategory, deleteCategory,
} from '@/api/categories'
import type { CategoryListDto, CategoryDetailDto, CreateCategoryPayload } from '@/api/categories'
import ProgramSelect from '@/components/shared/ProgramSelect'

export default function CategoriesPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateCategoryPayload>({ name: '', description: '', sortOrder: 0, programId: undefined })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '' })

  // --- Queries ---
  const { data: categories, isLoading: categoriesLoading } = useQuery<CategoryListDto[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

  const { data: category, isLoading: categoryLoading } = useQuery<CategoryDetailDto>({
    queryKey: ['categories', selectedId],
    queryFn: () => getCategory(selectedId!),
    enabled: selectedId !== null,
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', sortOrder: 0, programId: undefined })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; description?: string; sortOrder?: number }) =>
      updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['categories', selectedId] })
      setEditingHeader(false)
      toast.success('Category updated')
    },
    onError: () => toast.error('Failed to update category'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setSelectedId(null)
      toast.success('Category deleted')
    },
    onError: () => toast.error('Failed to delete category'),
  })

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    createMutation.mutate(sheetForm)
  }

  return (
    <div className="space-y-4 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted-foreground">Manage categories to organise reference datasets</p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setSheetForm({ name: '', description: '', sortOrder: 0 })
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Category
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {categoriesLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !categories || categories.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No categories yet.</div>
            ) : (
              categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                    selectedId === cat.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedId(cat.id)
                    setEditingHeader(false)
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {cat.program && (
                        <span
                          className="shrink-0 inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.program.color ?? '#6b7280' }}
                          title={cat.program.name}
                        />
                      )}
                      <span className="text-sm font-medium truncate">{cat.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs px-1.5 py-0 shrink-0">
                      {cat.dataSetCount}
                    </Badge>
                  </div>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{cat.description}</p>
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
              <p className="text-sm text-muted-foreground">Select a category to view its datasets</p>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {categoryLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : category ? (
                <>
                  {/* Category Header */}
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
                            id: category.id,
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
                    <div className="space-y-1 group">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">{category.name}</h2>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setHeaderForm({ name: category.name, description: category.description ?? '' })
                            setEditingHeader(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(category.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {category.description
                        ? <p className="text-sm text-muted-foreground">{category.description}</p>
                        : <p className="text-xs text-muted-foreground italic">No description — hover and click edit to add one</p>
                      }
                    </div>
                  )}

                  {/* Program Assignment */}
                  <ProgramSelect
                    value={category.program?.id ?? null}
                    onChange={(programId) =>
                      updateMutation.mutate({ id: category.id, programId: programId ?? 0 })
                    }
                  />

                  {/* Assigned Datasets */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Assigned Datasets</h3>
                      <Badge variant="secondary" className="text-xs">{category.dataSets.length}</Badge>
                    </div>

                    {category.dataSets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No datasets assigned to this category yet. Assign them from the Reference Data page.
                      </p>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        {category.dataSets.map((ds, i) => (
                          <div
                            key={ds.id}
                            className={`px-3 py-2.5 text-sm ${i < category.dataSets.length - 1 ? 'border-b' : ''}`}
                          >
                            {ds.name}
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

      {/* New Category Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Category</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Category name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-description">Description</Label>
              <Input
                id="cat-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cat-sort-order">Sort Order</Label>
              <Input
                id="cat-sort-order"
                type="number"
                value={sheetForm.sortOrder}
                onChange={e => setSheetForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>

            <ProgramSelect
              value={sheetForm.programId ?? null}
              onChange={(programId) => setSheetForm(f => ({ ...f, programId: programId ?? undefined }))}
            />

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
