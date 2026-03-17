import { useState, useEffect } from 'react'
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Pencil, Trash2, Check, X, ShieldAlert, GripVertical, ArrowUpAZ, ArrowDownAZ, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  getDataSets, getDataSet, createDataSet, updateDataSet,
  addItem, updateItem, deleteItem, reorderItems, setDataSetCategory,
  setDataSetProductTypes, setItemProductTypes, importDataSets, setDataSetPrograms,
} from '@/api/referenceData'
import type { DataSetListDto, DataSetDetailDto, DataItemDto, CreateDataSetPayload, ProductTypeRefDto, ImportDataSetSpec, ImportSummaryDto } from '@/api/referenceData'
import { getCategories } from '@/api/categories'
import type { CategoryListDto } from '@/api/categories'
import { getPrograms } from '@/api/programs'
import type { ProgramDto } from '@/api/programs'
import { getProductTypes } from '@/api/productTypes'
import type { ProductTypeListDto } from '@/api/productTypes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/authStore'

// ---------------------------------------------------------------------------
// SortableItemRow — defined outside main component to avoid re-creation
// ---------------------------------------------------------------------------

interface SortableItemRowProps {
  item: DataItemDto
  index: number
  isEditing: boolean
  editItem: { label: string; position: number; productTypeIds: number[] }
  setEditItem: (v: { label: string; position: number; productTypeIds: number[] }) => void
  allProductTypes: ProductTypeRefDto[]
  canEdit: boolean
  totalItems: number
  onEditStart: () => void
  onEditSave: () => void
  onEditCancel: () => void
  onDelete: () => void
  isSavePending: boolean
  isDeletePending: boolean
}

function SortableItemRow({
  item,
  index,
  isEditing,
  editItem,
  setEditItem,
  allProductTypes,
  canEdit,
  totalItems,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  isSavePending,
  isDeletePending,
}: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b last:border-b-0 hover:bg-muted/30">
      {/* Drag handle */}
      <td className="px-2 py-2 w-8">
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>

      {isEditing ? (
        <>
          <td className="px-2 py-2">
            <Input
              value={editItem.label}
              onChange={e => setEditItem({ ...editItem, label: e.target.value })}
              className="h-7 text-sm"
              placeholder="Label"
              autoFocus
            />
            {allProductTypes.length > 0 && (
              <div className="mt-1.5">
                <p className="text-xs text-muted-foreground mb-1">Product Types</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {allProductTypes.map(pt => (
                    <label key={pt.id} className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded"
                        checked={editItem.productTypeIds.includes(pt.id)}
                        onChange={e => {
                          const ids = e.target.checked
                            ? [...editItem.productTypeIds, pt.id]
                            : editItem.productTypeIds.filter(id => id !== pt.id)
                          setEditItem({ ...editItem, productTypeIds: ids })
                        }}
                      />
                      {pt.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </td>
          <td className="px-2 py-2 w-24">
            <Input
              type="number"
              min={1}
              max={totalItems}
              value={editItem.position}
              onChange={e => setEditItem({ ...editItem, position: Number(e.target.value) })}
              className="h-7 text-sm w-16"
            />
          </td>
          <td className="px-2 py-2 w-20">
            <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
              {item.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </td>
          <td className="px-2 py-2 w-24">
            <div className="flex items-center justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEditSave}
                disabled={isSavePending}
              >
                <Check className="h-3.5 w-3.5 text-green-600" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditCancel}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </div>
          </td>
        </>
      ) : (
        <>
          <td className="px-2 py-2 text-sm">{item.label}</td>
          <td className="px-2 py-2 w-24 text-sm text-muted-foreground">{index + 1}</td>
          <td className="px-2 py-2 w-20">
            <Badge variant={item.isActive ? 'default' : 'secondary'} className="text-xs">
              {item.isActive ? 'Active' : 'Inactive'}
            </Badge>
          </td>
          {canEdit && (
            <td className="px-2 py-2 w-24">
              <div className="flex items-center justify-end gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEditStart}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={onDelete}
                  disabled={isDeletePending}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </td>
          )}
        </>
      )}
    </tr>
  )
}

// ---------------------------------------------------------------------------
// CSV import parser
// ---------------------------------------------------------------------------

function parseCSVRow(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      cells.push(current); current = ''
    } else {
      current += ch
    }
  }
  cells.push(current)
  return cells
}

function parseCsvImport(text: string): ImportDataSetSpec[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
  if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row.')

  const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z]/g, ''))
  const col = (name: string) => headers.indexOf(name)
  const get = (cells: string[], name: string) => {
    const idx = col(name)
    return idx >= 0 ? cells[idx]?.trim() || undefined : undefined
  }

  const specs: ImportDataSetSpec[] = []
  let current: ImportDataSetSpec | null = null

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVRow(lines[i])
    const type = get(cells, 'type')?.toLowerCase()
    const name = get(cells, 'name')
    if (!name) continue

    if (type === 'dataset') {
      const ptRaw = get(cells, 'producttypes')
      current = {
        name,
        description: get(cells, 'description'),
        category: get(cells, 'category'),
        sortOrder: get(cells, 'sortorder') ? Number(get(cells, 'sortorder')) : undefined,
        isAdminOnly: get(cells, 'isadminonly') != null ? get(cells, 'isadminonly') === 'true' : undefined,
        productTypes: ptRaw ? ptRaw.split('|').map(s => s.trim()).filter(Boolean) : undefined,
        items: [],
      }
      specs.push(current)
    } else if (type === 'item') {
      if (!current) throw new Error(`Item "${name}" on row ${i + 1} has no preceding dataset row.`)
      const ptRaw = get(cells, 'producttypes')
      current.items = current.items ?? []
      current.items.push({
        label: name,
        sortOrder: get(cells, 'sortorder') ? Number(get(cells, 'sortorder')) : undefined,
        productTypes: ptRaw ? ptRaw.split('|').map(s => s.trim()).filter(Boolean) : undefined,
      })
    }
  }

  if (specs.length === 0) throw new Error('No dataset rows found. Each dataset row must have type=dataset.')
  return specs
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function ReferenceDataPage() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateDataSetPayload>({
    name: '',
    description: '',
    sortOrder: 0,
    isAdminOnly: false,
  })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '' })
  const [orderedItems, setOrderedItems] = useState<DataItemDto[]>([])
  const [addingItem, setAddingItem] = useState(false)
  const [newItem, setNewItem] = useState<{ label: string; sortOrder: number }>({ label: '', sortOrder: 0 })
  const [editingItemId, setEditingItemId] = useState<number | null>(null)
  const [editItem, setEditItem] = useState<{ label: string; position: number; productTypeIds: number[] }>({ label: '', position: 1, productTypeIds: [] })

  const [importOpen, setImportOpen] = useState(false)
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json')
  const [importJson, setImportJson] = useState('')
  const [importJsonError, setImportJsonError] = useState<string | null>(null)
  const [importResults, setImportResults] = useState<ImportSummaryDto | null>(null)

  // --- Queries ---
  const {
    data: datasets,
    isLoading: datasetsLoading,
  } = useQuery<DataSetListDto[]>({
    queryKey: ['reference-data'],
    queryFn: getDataSets,
  })

  const { data: categories = [] } = useQuery<CategoryListDto[]>({
    queryKey: ['categories'],
    queryFn: getCategories,
    enabled: isAdmin,
  })

  const { data: allPrograms = [] } = useQuery<ProgramDto[]>({
    queryKey: ['programs'],
    queryFn: getPrograms,
    enabled: isAdmin,
  })
  const activePrograms = allPrograms.filter(p => p.isActive)

  const { data: allProductTypes = [] } = useQuery<ProductTypeListDto[]>({
    queryKey: ['product-types'],
    queryFn: getProductTypes,
    enabled: selectedId !== null,
  })

  const {
    data: dataset,
    isLoading: datasetLoading,
  } = useQuery<DataSetDetailDto>({
    queryKey: ['reference-data', selectedId],
    queryFn: () => getDataSet(selectedId!),
    enabled: selectedId !== null,
  })

  // Sync orderedItems from fetched dataset
  useEffect(() => {
    if (dataset) setOrderedItems(dataset.items)
  }, [dataset])

  // --- DnD sensors ---
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // --- Mutations ---
  const createDataSetMutation = useMutation({
    mutationFn: createDataSet,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      toast.success('Dataset created successfully')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', sortOrder: 0, isAdminOnly: false, programIds: [] })
      setSelectedId(created.id)
    },
    onError: () => {
      toast.error('Failed to create dataset')
    },
  })

  const updateDataSetMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number; isAdminOnly?: boolean; name?: string; description?: string }) =>
      updateDataSet(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
      setEditingHeader(false)
      toast.success('Dataset updated')
    },
    onError: () => {
      toast.error('Failed to update dataset')
    },
  })

  const setCategoryMutation = useMutation({
    mutationFn: ({ dataSetId, categoryId }: { dataSetId: number; categoryId: number | null }) =>
      setDataSetCategory(dataSetId, categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category updated')
    },
    onError: () => toast.error('Failed to update category'),
  })

  const setDataSetProgramsMutation = useMutation({
    mutationFn: ({ dataSetId, programIds }: { dataSetId: number; programIds: number[] }) =>
      setDataSetPrograms(dataSetId, programIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
    },
    onError: () => toast.error('Failed to update programs'),
  })

  const setDataSetProductTypesMutation = useMutation({
    mutationFn: ({ dataSetId, productTypeIds }: { dataSetId: number; productTypeIds: number[] }) =>
      setDataSetProductTypes(dataSetId, productTypeIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['product-types'] })
      toast.success('Product types updated')
    },
    onError: () => toast.error('Failed to update product types'),
  })

  const setItemProductTypesMutation = useMutation({
    mutationFn: ({ itemId, productTypeIds }: { itemId: number; productTypeIds: number[] }) =>
      setItemProductTypes(selectedId!, itemId, productTypeIds),
    onSuccess: (updated) => {
      setOrderedItems(prev => prev.map(i => i.id === updated.id ? { ...i, productTypes: updated.productTypes } : i))
      queryClient.invalidateQueries({ queryKey: ['product-types'] })
    },
    onError: () => toast.error('Failed to update item product types'),
  })

  const addItemMutation = useMutation({
    mutationFn: ({ dataSetId, label, sortOrder }: { dataSetId: number; label: string; sortOrder: number }) =>
      addItem(dataSetId, { label, sortOrder }),
    onSuccess: (newItemResult) => {
      setOrderedItems(prev => [...prev, newItemResult])
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      toast.success('Item added')
      setAddingItem(false)
      setNewItem({ label: '', sortOrder: 0 })
      setEditingItemId(newItemResult.id)
      setEditItem({ label: newItemResult.label, position: orderedItems.length + 1, productTypeIds: newItemResult.productTypes.map(pt => pt.id) })
    },
    onError: () => {
      toast.error('Failed to add item')
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      updateItem(selectedId!, id, { label }),
    onSuccess: (updated) => {
      setOrderedItems(prev => prev.map(i => i.id === updated.id ? { ...i, label: updated.label } : i))
      setEditingItemId(null)
      toast.success('Item updated')
    },
    onError: () => {
      toast.error('Failed to update item')
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => deleteItem(selectedId!, itemId),
    onSuccess: (_, itemId) => {
      setOrderedItems(prev => prev.filter(i => i.id !== itemId))
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      toast.success('Item deleted')
    },
    onError: () => {
      toast.error('Failed to delete item')
    },
  })

  const reorderMutation = useMutation({
    mutationFn: (itemIds: number[]) => reorderItems(selectedId!, itemIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-data', selectedId] })
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
    },
  })

  const importMutation = useMutation({
    mutationFn: importDataSets,
    onSuccess: (result) => {
      setImportResults(result)
      queryClient.invalidateQueries({ queryKey: ['reference-data'] })
      queryClient.invalidateQueries({ queryKey: ['product-types'] })
      const created = result.results.filter(r => r.action === 'created').length
      const updated = result.results.filter(r => r.action === 'updated').length
      toast.success(`Import complete: ${created} created, ${updated} updated`)
    },
    onError: () => toast.error('Import failed'),
  })

  // --- Handlers ---
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = orderedItems.findIndex(i => i.id === active.id)
    const newIndex = orderedItems.findIndex(i => i.id === over.id)
    const newOrder = arrayMove(orderedItems, oldIndex, newIndex)
    setOrderedItems(newOrder)
    reorderMutation.mutate(newOrder.map(i => i.id))
  }

  function handleAlphaSort(dir: 'asc' | 'desc') {
    const sorted = [...orderedItems].sort((a, b) =>
      dir === 'asc' ? a.label.localeCompare(b.label) : b.label.localeCompare(a.label)
    )
    setOrderedItems(sorted)
    reorderMutation.mutate(sorted.map(i => i.id))
    toast.success(dir === 'asc' ? 'Sorted A → Z' : 'Sorted Z → A')
  }

  const handleSheetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetForm.name.trim()) {
      toast.error('Name is required')
      return
    }
    createDataSetMutation.mutate(sheetForm)
  }

  const handleAdminOnlyToggle = (checked: boolean) => {
    if (!dataset) return
    updateDataSetMutation.mutate({ id: dataset.id, isAdminOnly: checked })
  }

  const handleAddItem = () => {
    if (!newItem.label.trim()) {
      toast.error('Label is required')
      return
    }
    if (selectedId === null) return
    addItemMutation.mutate({ dataSetId: selectedId, label: newItem.label, sortOrder: newItem.sortOrder })
  }

  function handleEditItemSave(itemId: number) {
    if (!editItem.label.trim()) {
      toast.error('Label is required')
      return
    }
    const currentIndex = orderedItems.findIndex(i => i.id === itemId)
    const newIndex = Math.max(0, Math.min(editItem.position - 1, orderedItems.length - 1))
    const currentItem = orderedItems[currentIndex]
    const labelChanged = editItem.label.trim() !== currentItem?.label
    const positionChanged = currentIndex !== newIndex
    const currentPtIds = (currentItem?.productTypes ?? []).map(pt => pt.id).sort().join(',')
    const newPtIds = [...editItem.productTypeIds].sort().join(',')
    const productTypesChanged = currentPtIds !== newPtIds

    if (labelChanged) {
      updateItemMutation.mutate({ id: itemId, label: editItem.label.trim() })
    }
    if (positionChanged) {
      const newOrder = arrayMove(orderedItems, currentIndex, newIndex)
      setOrderedItems(newOrder)
      reorderMutation.mutate(newOrder.map(i => i.id))
    }
    if (productTypesChanged) {
      setItemProductTypesMutation.mutate({ itemId, productTypeIds: editItem.productTypeIds })
    }

    // Close edit form immediately for better UX; mutations run in background
    setEditingItemId(null)
  }

  const handleDeleteItem = (itemId: number) => {
    deleteItemMutation.mutate(itemId)
  }

  function handleImport() {
    let specs: ImportDataSetSpec[]
    try {
      if (importFormat === 'csv') {
        specs = parseCsvImport(importJson)
      } else {
        specs = JSON.parse(importJson)
        if (!Array.isArray(specs)) {
          setImportJsonError('Expected a JSON array (e.g. [{ "name": "..." }])')
          return
        }
      }
    } catch (e) {
      setImportJsonError(e instanceof Error ? e.message : 'Parse error — please check your input.')
      return
    }
    setImportJsonError(null)
    importMutation.mutate(specs)
  }

  const canEdit = isAdmin || (dataset ? !dataset.isAdminOnly : false)

  return (
    <div className="space-y-4 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold">Reference Data</h1>
        <p className="text-sm text-muted-foreground">Manage reusable lookup datasets</p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          {isAdmin && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setSheetForm({ name: '', description: '', sortOrder: 0, isAdminOnly: false, programIds: [] })
                  setSheetOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                New Dataset
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setImportResults(null)
                  setImportJsonError(null)
                  setImportJson('')
                  setImportFormat('json')
                  setImportOpen(true)
                }}
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {datasetsLoading ? (
              <div className="space-y-0">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : !datasets || datasets.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No datasets yet.</div>
            ) : (
              datasets.map((ds) => (
                <div
                  key={ds.id}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                    selectedId === ds.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => {
                    setSelectedId(ds.id)
                    setAddingItem(false)
                    setEditingItemId(null)
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {ds.programs.map(p => (
                        <span
                          key={p.id}
                          className="shrink-0 inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color ?? '#6b7280' }}
                          title={p.name}
                        />
                      ))}
                      <span className="text-sm font-medium truncate">{ds.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {ds.isAdminOnly && (
                        <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <Badge variant="secondary" className="text-xs px-1.5 py-0">
                        {ds.itemCount}
                      </Badge>
                    </div>
                  </div>
                  {ds.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{ds.description}</p>
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
              <p className="text-sm text-muted-foreground">Select a dataset to view its items</p>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {datasetLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : dataset ? (
                <>
                  {/* Dataset Header */}
                  {editingHeader ? (
                    <div className="space-y-2 pb-2 border-b">
                      <Input
                        className="text-lg font-semibold h-9"
                        value={headerForm.name}
                        onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Dataset name"
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
                          disabled={!headerForm.name.trim() || updateDataSetMutation.isPending}
                          onClick={() => updateDataSetMutation.mutate({
                            id: dataset.id,
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-semibold">{dataset.name}</h2>
                        {dataset.isAdminOnly && (
                          <Badge variant="secondary" className="gap-1">
                            <ShieldAlert className="h-3 w-3" />
                            Admin Only
                          </Badge>
                        )}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              setHeaderForm({ name: dataset.name, description: dataset.description ?? '' })
                              setEditingHeader(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {dataset.description
                        ? <p className="text-sm text-muted-foreground">{dataset.description}</p>
                        : isAdmin && <p className="text-xs text-muted-foreground italic">No description — hover and click edit to add one</p>
                      }
                    </div>
                  )}

                  {/* Category Select (Admin only) */}
                  {isAdmin && (
                    <div className="flex items-center gap-3 py-2 border-b">
                      <div className="flex flex-col gap-1 flex-1">
                        <Label className="text-sm">Category</Label>
                        <Select
                          value={dataset.category?.id?.toString() ?? 'none'}
                          onValueChange={(val) =>
                            setCategoryMutation.mutate({
                              dataSetId: dataset.id,
                              categoryId: val === 'none' ? null : Number(val),
                            })
                          }
                          disabled={setCategoryMutation.isPending}
                        >
                          <SelectTrigger className="h-8 text-sm w-56">
                            <SelectValue placeholder="No category">
                              {dataset.category?.name ?? 'No category'}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No category</SelectItem>
                            {categories.map(cat => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* Program Assignment (Admin only) */}
                  {isAdmin && activePrograms.length > 0 && (
                    <div className="py-2 border-b space-y-1.5">
                      <Label className="text-sm">Programs</Label>
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                        {activePrograms.map(p => (
                          <label key={p.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded"
                              checked={dataset.programs.some(dp => dp.id === p.id)}
                              disabled={setDataSetProgramsMutation.isPending}
                              onChange={e => {
                                const currentIds = dataset.programs.map(dp => dp.id)
                                const newIds = e.target.checked
                                  ? [...currentIds, p.id]
                                  : currentIds.filter(id => id !== p.id)
                                setDataSetProgramsMutation.mutate({ dataSetId: dataset.id, programIds: newIds })
                              }}
                            />
                            <span
                              className="inline-block h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: p.color ?? '#6b7280' }}
                            />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Only Toggle */}
                  {isAdmin && (
                    <div className="flex items-center gap-3 py-2 border-b">
                      <Switch
                        id="admin-only-toggle"
                        checked={dataset.isAdminOnly}
                        onCheckedChange={handleAdminOnlyToggle}
                        disabled={updateDataSetMutation.isPending}
                      />
                      <Label htmlFor="admin-only-toggle" className="text-sm cursor-pointer">
                        Admin Only — only admins can edit items in this dataset
                      </Label>
                    </div>
                  )}

                  {/* Product Types Assignment (visible to canEdit users) */}
                  {canEdit && allProductTypes.length > 0 && (
                    <div className="py-2 border-b space-y-1.5">
                      <Label className="text-sm">Product Types</Label>
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                        {allProductTypes.map(pt => (
                          <label key={pt.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded"
                              checked={dataset.productTypes.some(dpt => dpt.id === pt.id)}
                              disabled={setDataSetProductTypesMutation.isPending}
                              onChange={e => {
                                const currentIds = dataset.productTypes.map(dpt => dpt.id)
                                const newIds = e.target.checked
                                  ? [...currentIds, pt.id]
                                  : currentIds.filter(id => id !== pt.id)
                                setDataSetProductTypesMutation.mutate({ dataSetId: dataset.id, productTypeIds: newIds })
                              }}
                            />
                            {pt.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Items Section */}
                  <div className="space-y-3">
                    {/* Items header with sort buttons and Add Item */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Items</h3>
                      <div className="flex items-center gap-1.5">
                        {canEdit && orderedItems.length > 1 && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleAlphaSort('asc')}
                            >
                              <ArrowUpAZ className="h-3.5 w-3.5" />
                              A→Z
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => handleAlphaSort('desc')}
                            >
                              <ArrowDownAZ className="h-3.5 w-3.5" />
                              Z→A
                            </Button>
                          </>
                        )}
                        {canEdit && !addingItem && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setAddingItem(true)
                              setNewItem({ label: '', sortOrder: orderedItems.length + 1 })
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add Item
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Items Table */}
                    {orderedItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items yet. Add one below.</p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="rounded-md border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="w-8" /> {/* drag handle col */}
                                <th className="text-left font-medium px-2 py-2">Label</th>
                                <th className="text-left font-medium px-2 py-2 w-24">Position</th>
                                <th className="text-left font-medium px-2 py-2 w-20">Active</th>
                                {canEdit && (
                                  <th className="text-right font-medium px-2 py-2 w-24">Actions</th>
                                )}
                              </tr>
                            </thead>
                            <SortableContext
                              items={orderedItems.map(i => i.id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <tbody>
                                {orderedItems.map((item, index) => (
                                  <SortableItemRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    totalItems={orderedItems.length}
                                    isEditing={editingItemId === item.id}
                                    editItem={editItem}
                                    setEditItem={setEditItem}
                                    allProductTypes={allProductTypes}
                                    canEdit={canEdit}
                                    onEditStart={() => {
                                      setEditingItemId(item.id)
                                      setEditItem({ label: item.label, position: index + 1, productTypeIds: item.productTypes.map(pt => pt.id) })
                                    }}
                                    onEditSave={() => handleEditItemSave(item.id)}
                                    onEditCancel={() => setEditingItemId(null)}
                                    onDelete={() => handleDeleteItem(item.id)}
                                    isSavePending={updateItemMutation.isPending || reorderMutation.isPending}
                                    isDeletePending={deleteItemMutation.isPending}
                                  />
                                ))}
                              </tbody>
                            </SortableContext>
                          </table>
                        </div>
                      </DndContext>
                    )}

                    {/* Add Item Inline Form */}
                    {canEdit && addingItem && (
                      <div className="rounded-md border p-3 space-y-3 bg-muted/20">
                        <p className="text-sm font-medium">New Item</p>
                        <div className="flex items-end gap-3">
                          <div className="flex-1 space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={newItem.label}
                              onChange={(e) =>
                                setNewItem((prev) => ({ ...prev, label: e.target.value }))
                              }
                              placeholder="Enter label"
                              className="h-8 text-sm"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddItem()
                                if (e.key === 'Escape') {
                                  setAddingItem(false)
                                  setNewItem({ label: '', sortOrder: 0 })
                                }
                              }}
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              onClick={handleAddItem}
                              disabled={addItemMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setAddingItem(false)
                                setNewItem({ label: '', sortOrder: 0 })
                              }}
                            >
                              <X className="h-3.5 w-3.5 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Reference Data</DialogTitle>
            <DialogDescription>
              Create or update datasets by pasting JSON or CSV. Datasets are matched by name, items by label. Category and product type names must already exist.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* Format toggle */}
            <div className="flex items-center gap-1 rounded-md border w-fit p-0.5">
              {(['json', 'csv'] as const).map(fmt => (
                <button
                  key={fmt}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                    importFormat === fmt
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setImportFormat(fmt)
                    setImportJsonError(null)
                    setImportResults(null)
                    setImportJson('')
                  }}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>

            <textarea
              className="w-full h-56 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={importFormat === 'csv'
                ? 'type,name,description,category,sortOrder,isAdminOnly,productTypes\ndataset,My Dataset,,UOM,1,false,Brewery|Winery\nitem,Item A,,,1,,Brewery\nitem,Item B,,,2,,Winery'
                : '[\n  {\n    "name": "My Dataset",\n    "category": "UOM",\n    "productTypes": ["Brewery"],\n    "items": [\n      { "label": "Item 1", "productTypes": ["Brewery"] }\n    ]\n  }\n]'
              }
              value={importJson}
              onChange={e => {
                setImportJson(e.target.value)
                setImportJsonError(null)
                setImportResults(null)
              }}
              spellCheck={false}
            />

            {importJsonError && (
              <p className="text-sm text-destructive">{importJsonError}</p>
            )}

            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground select-none">
                Show format guide
              </summary>
              {importFormat === 'csv' ? (
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-52 leading-relaxed">{`type,name,description,category,sortOrder,isAdminOnly,productTypes
dataset,Gravity Unit of Measurement,Units for gravity,UOM,1,false,Brewery|Winery
item,Specific Gravity,,,1,,Brewery
item,Brix,,,2,,Winery
item,Plato,,,3,,
dataset,Hop Varieties,,,,false,Brewery
item,Cascade,,,1,,Brewery
item,Centennial,,,2,,Brewery

Rules:
- type: "dataset" or "item" (required)
- Items belong to the most recently seen dataset row
- productTypes: use | to separate multiple (e.g. Brewery|Winery)
- category/productTypes: leave empty to leave unchanged
- Lines starting with # are ignored`}</pre>
              ) : (
                <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-auto max-h-52 leading-relaxed">{`[
  {
    "name": "Gravity Unit of Measurement",   // required — matches existing by name
    "description": "Units for gravity",       // optional
    "sortOrder": 1,                           // optional
    "isAdminOnly": false,                     // optional
    "category": "UOM",                        // optional — must exist; "" to clear
    "productTypes": ["Brewery", "Winery"],    // optional — omit=no change, []=clear
    "items": [
      {
        "label": "Specific Gravity",          // required — matched by label
        "sortOrder": 1,                       // optional
        "productTypes": ["Brewery"]           // optional — same rules as above
      },
      { "label": "Brix", "productTypes": ["Winery"] },
      { "label": "Plato" }
    ]
  }
]`}</pre>
              )}
            </details>

            {importResults && (
              <div className="space-y-2 max-h-52 overflow-y-auto rounded-md border p-2">
                <p className="text-xs font-medium text-muted-foreground px-1">Results</p>
                {importResults.results.map((r, i) => (
                  <div key={i} className="rounded-md bg-muted/40 px-3 py-2 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={r.action === 'created' ? 'default' : r.action === 'skipped' ? 'destructive' : 'secondary'}>
                        {r.action}
                      </Badge>
                      <span className="text-sm font-medium">{r.name}</span>
                      {(r.itemsCreated > 0 || r.itemsUpdated > 0) && (
                        <span className="text-xs text-muted-foreground">
                          {[
                            r.itemsCreated > 0 && `${r.itemsCreated} items created`,
                            r.itemsUpdated > 0 && `${r.itemsUpdated} items updated`,
                          ].filter(Boolean).join(', ')}
                        </span>
                      )}
                    </div>
                    {r.warnings.length > 0 && (
                      <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5 pl-1">
                        {r.warnings.map((w, wi) => <li key={wi}>⚠ {w}</li>)}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Close
            </Button>
            <Button onClick={handleImport} disabled={importMutation.isPending || !importJson.trim()}>
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Dataset Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Dataset</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="ds-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ds-name"
                value={sheetForm.name}
                onChange={(e) => setSheetForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Dataset name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ds-description">Description</Label>
              <Input
                id="ds-description"
                value={sheetForm.description ?? ''}
                onChange={(e) => setSheetForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ds-sort-order">Sort Order</Label>
              <Input
                id="ds-sort-order"
                type="number"
                value={sheetForm.sortOrder}
                onChange={(e) =>
                  setSheetForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))
                }
              />
            </div>

            <div className="flex items-start gap-3 pt-1">
              <Switch
                id="ds-admin-only"
                checked={sheetForm.isAdminOnly}
                onCheckedChange={(checked) =>
                  setSheetForm((prev) => ({ ...prev, isAdminOnly: checked }))
                }
              />
              <div className="space-y-0.5">
                <Label htmlFor="ds-admin-only" className="cursor-pointer">
                  Admin Only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only admins can edit items in this dataset
                </p>
              </div>
            </div>

            {activePrograms.length > 0 && (
              <div className="space-y-1.5">
                <Label>Programs</Label>
                <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                  {activePrograms.map(p => (
                    <label key={p.id} className="flex items-center gap-1.5 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded"
                        checked={(sheetForm.programIds ?? []).includes(p.id)}
                        onChange={e => {
                          const current = sheetForm.programIds ?? []
                          const next = e.target.checked
                            ? [...current, p.id]
                            : current.filter(id => id !== p.id)
                          setSheetForm(f => ({ ...f, programIds: next }))
                        }}
                      />
                      <span
                        className="inline-block h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color ?? '#6b7280' }}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <SheetFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={createDataSetMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createDataSetMutation.isPending}>
                {createDataSetMutation.isPending ? 'Creating...' : 'Create Dataset'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
