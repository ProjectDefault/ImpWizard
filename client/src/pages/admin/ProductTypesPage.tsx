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
  getProductTypes, getProductType, createProductType, updateProductType, deleteProductType,
} from '@/api/productTypes'
import type { ProductTypeListDto, ProductTypeDetailDto, CreateProductTypePayload } from '@/api/productTypes'

export default function ProductTypesPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateProductTypePayload>({ name: '', description: '', sortOrder: 0 })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '' })

  // --- Queries ---
  const { data: productTypes, isLoading: listLoading } = useQuery<ProductTypeListDto[]>({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
  })

  const { data: productType, isLoading: detailLoading } = useQuery<ProductTypeDetailDto>({
    queryKey: ['product-types', selectedId],
    queryFn: () => getProductType(selectedId!),
    enabled: selectedId !== null,
  })

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: createProductType,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] })
      toast.success('Product type created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', sortOrder: 0 })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create product type'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number; name?: string; description?: string; sortOrder?: number }) =>
      updateProductType(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] })
      queryClient.invalidateQueries({ queryKey: ['product-types', selectedId] })
      setEditingHeader(false)
      toast.success('Product type updated')
    },
    onError: () => toast.error('Failed to update product type'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProductType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-types'] })
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      setSelectedId(null)
      toast.success('Product type deleted')
    },
    onError: () => toast.error('Failed to delete product type'),
  })

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    createMutation.mutate(sheetForm)
  }

  // Group items by dataset for the detail view
  const itemsByDataSet = productType
    ? Object.values(
        productType.items.reduce<Record<number, { dataSetId: number; dataSetName: string; labels: string[] }>>(
          (acc, item) => {
            if (!acc[item.dataSetId]) {
              acc[item.dataSetId] = { dataSetId: item.dataSetId, dataSetName: item.dataSetName, labels: [] }
            }
            acc[item.dataSetId].labels.push(item.label)
            return acc
          },
          {}
        )
      )
    : []

  return (
    <div className="space-y-4 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Product Types</h1>
        <p className="text-sm text-muted-foreground">Manage product types to classify datasets and items</p>
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
            New Product Type
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !productTypes || productTypes.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No product types yet.</div>
            ) : (
              productTypes.map((pt) => (
                <div
                  key={pt.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                    selectedId === pt.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedId(pt.id)
                    setEditingHeader(false)
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{pt.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0" title="Datasets">
                        {pt.dataSetCount}ds
                      </Badge>
                      <Badge variant="secondary" className="text-xs px-1.5 py-0" title="Items">
                        {pt.itemCount}i
                      </Badge>
                    </div>
                  </div>
                  {pt.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{pt.description}</p>
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
              <p className="text-sm text-muted-foreground">Select a product type to view its assignments</p>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {detailLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : productType ? (
                <>
                  {/* Header */}
                  {editingHeader ? (
                    <div className="space-y-2 pb-2 border-b">
                      <Input
                        className="text-lg font-semibold h-9"
                        value={headerForm.name}
                        onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Product type name"
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
                            id: productType.id,
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
                    <div className="space-y-1 group pb-2 border-b">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-semibold">{productType.name}</h2>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setHeaderForm({ name: productType.name, description: productType.description ?? '' })
                            setEditingHeader(true)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(productType.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {productType.description
                        ? <p className="text-sm text-muted-foreground">{productType.description}</p>
                        : <p className="text-xs text-muted-foreground italic">No description — hover and click edit to add one</p>
                      }
                    </div>
                  )}

                  {/* Assigned Datasets */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">Assigned Datasets</h3>
                      <Badge variant="secondary" className="text-xs">{productType.dataSets.length}</Badge>
                    </div>
                    {productType.dataSets.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None assigned yet.</p>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        {productType.dataSets.map((ds, i) => (
                          <div key={ds.id} className={`px-3 py-2 text-sm ${i < productType.dataSets.length - 1 ? 'border-b' : ''}`}>
                            {ds.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assigned Items (grouped by dataset) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium">Assigned Items</h3>
                      <Badge variant="secondary" className="text-xs">{productType.items.length}</Badge>
                    </div>
                    {itemsByDataSet.length === 0 ? (
                      <p className="text-sm text-muted-foreground">None assigned yet.</p>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        {itemsByDataSet.map((group, gi) => (
                          <div key={group.dataSetId} className={gi < itemsByDataSet.length - 1 ? 'border-b' : ''}>
                            <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted/40">
                              {group.dataSetName}
                            </div>
                            {group.labels.map((label, li) => (
                              <div
                                key={li}
                                className={`px-3 py-2 text-sm pl-5 ${li < group.labels.length - 1 ? 'border-b border-border/50' : ''}`}
                              >
                                {label}
                              </div>
                            ))}
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

      {/* New Product Type Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Product Type</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="pt-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pt-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Brewery"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pt-description">Description</Label>
              <Input
                id="pt-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pt-sort-order">Sort Order</Label>
              <Input
                id="pt-sort-order"
                type="number"
                value={sheetForm.sortOrder}
                onChange={e => setSheetForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>

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
                {createMutation.isPending ? 'Creating...' : 'Create Product Type'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
