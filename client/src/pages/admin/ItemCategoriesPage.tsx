import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getItemCategories, createItemCategory, updateItemCategory, deleteItemCategory,
} from '@/api/itemCategories'
import type { ItemCategoryDto, CreateItemCategoryPayload } from '@/api/itemCategories'

type EditForm = { name: string; description: string; sortOrder: number; isActive: boolean }

export default function ItemCategoriesPage() {
  const queryClient = useQueryClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateItemCategoryPayload>({ name: '', description: '', sortOrder: 0 })

  const [editItem, setEditItem] = useState<ItemCategoryDto | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', description: '', sortOrder: 0, isActive: true })

  const { data: categories, isLoading } = useQuery<ItemCategoryDto[]>({
    queryKey: ['item-categories'],
    queryFn: getItemCategories,
  })

  const createMutation = useMutation({
    mutationFn: createItemCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
      toast.success('Category created')
      setCreateOpen(false)
      setCreateForm({ name: '', description: '', sortOrder: 0 })
    },
    onError: () => toast.error('Failed to create category'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & EditForm) =>
      updateItemCategory(id, {
        name: payload.name,
        description: payload.description || undefined,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
      toast.success('Category updated')
      setEditItem(null)
    },
    onError: () => toast.error('Failed to update category'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteItemCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item-categories'] })
      toast.success('Category deleted')
    },
    onError: () => toast.error('Cannot delete — category may be in use by catalog items'),
  })

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim()) { toast.error('Name is required'); return }
    createMutation.mutate(createForm)
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editForm.name.trim()) { toast.error('Name is required'); return }
    updateMutation.mutate({ id: editItem!.id, ...editForm })
  }

  const openEdit = (cat: ItemCategoryDto) => {
    setEditItem(cat)
    setEditForm({ name: cat.name, description: cat.description ?? '', sortOrder: cat.sortOrder, isActive: cat.isActive })
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Ingredient Categories</h1>
          <p className="text-sm text-muted-foreground">Manage categories used to classify catalog items</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          New Category
        </Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        {isLoading ? (
          <div className="space-y-0">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-64 ml-2" />
              </div>
            ))}
          </div>
        ) : !categories || categories.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            No ingredient categories yet. Click "New Category" to add one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground w-20">Order</th>
                <th className="text-center px-4 py-2 font-medium text-muted-foreground w-20">Active</th>
                <th className="px-4 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, i) => (
                <tr key={cat.id} className={`hover:bg-muted/30 ${i < categories.length - 1 ? 'border-b' : ''}`}>
                  <td className="px-4 py-2.5 font-medium">{cat.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{cat.description ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center text-muted-foreground">{cat.sortOrder}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant={cat.isActive ? 'default' : 'secondary'} className="text-xs">
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(cat)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          if (confirm(`Delete "${cat.name}"? This cannot be undone.`)) {
                            deleteMutation.mutate(cat.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Ingredient Category</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Hops"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-desc">Description</Label>
              <Textarea
                id="create-desc"
                value={createForm.description ?? ''}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-sort">Sort Order</Label>
              <Input
                id="create-sort"
                type="number"
                value={createForm.sortOrder ?? 0}
                onChange={e => setCreateForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Category'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={editItem !== null} onOpenChange={open => { if (!open) setEditItem(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit Category</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-sort">Sort Order</Label>
              <Input
                id="edit-sort"
                type="number"
                value={editForm.sortOrder}
                onChange={e => setEditForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-active"
                checked={editForm.isActive}
                onCheckedChange={checked => setEditForm(f => ({ ...f, isActive: checked }))}
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditItem(null)} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
