import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Search, Plus, Upload, Download, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import { createSupplier } from '@/api/suppliers'
import { createVendor } from '@/api/vendors'
import {
  getCatalogItems, getCatalogItem, createCatalogItem, updateCatalogItem, deleteCatalogItem,
  setCatalogItemProductTypes, setCatalogItemCategories,
  bulkUpdateCatalogItems, importCatalogItems, exportCatalogUrl,
} from '@/api/catalog'
import type {
  CatalogItemListDto, CatalogItemDetailDto, CreateCatalogItemPayload,
  UpdateCatalogItemPayload, CatalogFilters, ImportItemSpec, BulkUpdatePayload,
} from '@/api/catalog'
import { getItemCategories } from '@/api/itemCategories'
import { getSuppliers } from '@/api/suppliers'
import { getVendors } from '@/api/vendors'
import { getPrograms } from '@/api/programs'
import { getProductTypes } from '@/api/productTypes'
import { getUnitsOfMeasure } from '@/api/unitsOfMeasure'

const PAGE_SIZE = 50

type SheetMode = 'create' | 'edit'

interface ItemForm {
  itemName: string
  programId: number | null
  supplierId: number | null
  vendorId: number | null
  vendorItemNumber: string
  purchaseUomDescription: string
  purchaseAmountPerUom: string
  purchaseUomId: number | null
  isActive: boolean
  sortOrder: number
  productTypeIds: number[]
  categoryIds: number[]
}

const emptyForm = (): ItemForm => ({
  itemName: '',
  programId: null,
  supplierId: null,
  vendorId: null,
  vendorItemNumber: '',
  purchaseUomDescription: '',
  purchaseAmountPerUom: '',
  purchaseUomId: null,
  isActive: true,
  sortOrder: 0,
  productTypeIds: [],
  categoryIds: [],
})

export default function CatalogPage() {
  const queryClient = useQueryClient()

  // Filters
  const [search, setSearch] = useState('')
  const [programFilter, setProgramFilter] = useState<number | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null)
  const [supplierFilter, setSupplierFilter] = useState<number | null>(null)
  const [vendorFilter, setVendorFilter] = useState<number | null>(null)
  const [productTypeFilter, setProductTypeFilter] = useState<number | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [page, setPage] = useState(1)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkSheetOpen, setBulkSheetOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState<Partial<BulkUpdatePayload>>({})

  // Item sheet
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<SheetMode>('create')
  const [editItemId, setEditItemId] = useState<number | null>(null)
  const [form, setForm] = useState<ItemForm>(emptyForm())

  // Inline Supplier quick-create
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')

  // Inline Vendor quick-create
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')

  const importInputRef = useRef<HTMLInputElement>(null)

  // --- Queries ---
  const filters: CatalogFilters = {
    search: search || undefined,
    programId: programFilter ?? undefined,
    categoryId: categoryFilter ?? undefined,
    supplierId: supplierFilter ?? undefined,
    vendorId: vendorFilter ?? undefined,
    productTypeId: productTypeFilter ?? undefined,
    isActive: showInactive ? undefined : true,
    page,
    pageSize: PAGE_SIZE,
  }

  const { data: catalogData, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalog', filters],
    queryFn: () => getCatalogItems(filters),
    placeholderData: prev => prev,
  })

  const { data: categories } = useQuery({ queryKey: ['item-categories'], queryFn: getItemCategories })
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: getSuppliers })
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: getVendors })
  const { data: programs } = useQuery({ queryKey: ['programs'], queryFn: getPrograms })
  const { data: productTypes } = useQuery({ queryKey: ['product-types'], queryFn: getProductTypes })
  const { data: uoms } = useQuery({ queryKey: ['units-of-measure'], queryFn: getUnitsOfMeasure })

  const { data: editDetail } = useQuery<CatalogItemDetailDto>({
    queryKey: ['catalog', editItemId],
    queryFn: () => getCatalogItem(editItemId!),
    enabled: editItemId !== null && sheetMode === 'edit',
  })

  // When editDetail loads, populate form
  const prevEditId = useState<number | null>(null)
  if (editDetail && editItemId !== prevEditId[0]) {
    prevEditId[1](editItemId)
    setForm({
      itemName: editDetail.itemName,
      programId: editDetail.programId,
      supplierId: editDetail.supplierId,
      vendorId: editDetail.vendorId,
      vendorItemNumber: editDetail.vendorItemNumber ?? '',
      purchaseUomDescription: editDetail.purchaseUomDescription ?? '',
      purchaseAmountPerUom: editDetail.purchaseAmountPerUom?.toString() ?? '',
      purchaseUomId: editDetail.purchaseUomId,
      isActive: editDetail.isActive,
      sortOrder: editDetail.sortOrder,
      productTypeIds: editDetail.productTypes.map(pt => pt.id),
      categoryIds: editDetail.categories.map(c => c.id),
    })
  }

  // --- Mutations ---
  const invalidateCatalog = () => queryClient.invalidateQueries({ queryKey: ['catalog'] })

  const createMutation = useMutation({
    mutationFn: async (f: ItemForm) => {
      const payload: CreateCatalogItemPayload = {
        itemName: f.itemName,
        programId: f.programId,
        supplierId: f.supplierId,
        vendorId: f.vendorId,
        vendorItemNumber: f.vendorItemNumber || undefined,
        purchaseUomDescription: f.purchaseUomDescription || undefined,
        purchaseAmountPerUom: f.purchaseAmountPerUom ? parseFloat(f.purchaseAmountPerUom) : null,
        purchaseUomId: f.purchaseUomId,
        sortOrder: f.sortOrder,
      }
      const item = await createCatalogItem(payload)
      if (f.productTypeIds.length > 0) await setCatalogItemProductTypes(item.id, f.productTypeIds)
      if (f.categoryIds.length > 0) await setCatalogItemCategories(item.id, f.categoryIds)
      return item
    },
    onSuccess: () => { invalidateCatalog(); toast.success('Item created'); setSheetOpen(false); setForm(emptyForm()) },
    onError: () => toast.error('Failed to create item'),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, f }: { id: number; f: ItemForm }) => {
      const payload: UpdateCatalogItemPayload = {
        itemName: f.itemName,
        isActive: f.isActive,
        programId: f.programId,
        supplierId: f.supplierId,
        vendorId: f.vendorId,
        vendorItemNumber: f.vendorItemNumber || undefined,
        purchaseUomDescription: f.purchaseUomDescription || undefined,
        purchaseAmountPerUom: f.purchaseAmountPerUom ? parseFloat(f.purchaseAmountPerUom) : null,
        purchaseUomId: f.purchaseUomId,
        sortOrder: f.sortOrder,
      }
      await updateCatalogItem(id, payload)
      await setCatalogItemProductTypes(id, f.productTypeIds)
      await setCatalogItemCategories(id, f.categoryIds)
    },
    onSuccess: () => { invalidateCatalog(); toast.success('Item updated'); setSheetOpen(false); setEditItemId(null) },
    onError: () => toast.error('Failed to update item'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCatalogItem,
    onSuccess: () => { invalidateCatalog(); toast.success('Item deleted') },
    onError: () => toast.error('Failed to delete item'),
  })

  const bulkMutation = useMutation({
    mutationFn: bulkUpdateCatalogItems,
    onSuccess: ({ updated }) => {
      invalidateCatalog()
      toast.success(`Updated ${updated} items`)
      setSelectedIds(new Set())
      setBulkSheetOpen(false)
      setBulkForm({})
    },
    onError: () => toast.error('Bulk update failed'),
  })

  const importMutation = useMutation({
    mutationFn: importCatalogItems,
    onSuccess: (result) => {
      invalidateCatalog()
      const created = result.results.filter(r => r.action === 'created').length
      const updated = result.results.filter(r => r.action === 'updated').length
      toast.success(`Import complete: ${created} created, ${updated} updated`)
    },
    onError: () => toast.error('Import failed'),
  })

  const createSupplierMutation = useMutation({
    mutationFn: (name: string) => createSupplier({ name, isActive: true }),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      setForm(f => ({ ...f, supplierId: supplier.id }))
      setSupplierDialogOpen(false)
      setNewSupplierName('')
      toast.success(`Supplier "${supplier.name}" created`)
    },
    onError: () => toast.error('Failed to create supplier'),
  })

  const createVendorMutation = useMutation({
    mutationFn: (name: string) => createVendor({ name, isActive: true }),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setForm(f => ({ ...f, vendorId: vendor.id }))
      setVendorDialogOpen(false)
      setNewVendorName('')
      toast.success(`Vendor "${vendor.name}" created`)
    },
    onError: () => toast.error('Failed to create vendor'),
  })

  // --- Helpers ---
  const resetFilters = () => {
    setSearch(''); setProgramFilter(null); setCategoryFilter(null)
    setSupplierFilter(null); setVendorFilter(null); setProductTypeFilter(null)
    setShowInactive(false); setPage(1)
  }

  const openCreate = () => {
    setSheetMode('create')
    setEditItemId(null)
    prevEditId[1](null)
    setForm(emptyForm())
    setSheetOpen(true)
  }

  const openEdit = (item: CatalogItemListDto) => {
    setSheetMode('edit')
    setEditItemId(item.id)
    setSheetOpen(true)
  }

  const toggleSelected = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === (catalogData?.items.length ?? 0)) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(catalogData?.items.map(i => i.id) ?? []))
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string
        const specs = parseImportCsv(text)
        importMutation.mutate(specs)
      } catch {
        toast.error('Failed to parse import file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const parseImportCsv = (text: string): ImportItemSpec[] => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s/g, ''))
    return lines.slice(1).map(line => {
      const cols = splitCsvLine(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => { obj[h] = cols[i] ?? '' })
      return {
        itemName: obj['itemname'] ?? obj['name'] ?? '',
        programName: obj['program'] || obj['programname'] || undefined,
        supplierName: obj['supplier'] || obj['suppliername'] || undefined,
        vendorName: obj['vendor'] || obj['vendorname'] || undefined,
        vendorItemNumber: obj['vendoritemnumber'] || obj['vendorsku'] || undefined,
        purchaseUomDescription: obj['purchaseuomdescription'] || undefined,
        purchaseAmountPerUom: obj['purchaseamountperuom'] ? parseFloat(obj['purchaseamountperuom']) : undefined,
        purchaseUomName: obj['purchaseuom'] || obj['uom'] || undefined,
        isActive: obj['isactive'] !== 'false',
        productTypeNames: obj['producttypes'] ? obj['producttypes'].split('|').filter(Boolean) : undefined,
        categoryNames: obj['categories'] ? obj['categories'].split('|').filter(Boolean) : undefined,
      } satisfies ImportItemSpec
    }).filter(s => s.itemName)
  }

  const splitCsvLine = (line: string): string[] => {
    const result: string[] = []
    let cur = '', inQuote = false
    for (const ch of line) {
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  const totalPages = Math.ceil((catalogData?.totalCount ?? 0) / PAGE_SIZE)
  const showingFrom = ((page - 1) * PAGE_SIZE) + 1
  const showingTo = Math.min(page * PAGE_SIZE, catalogData?.totalCount ?? 0)

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.itemName.trim()) { toast.error('Item name is required'); return }
    if (sheetMode === 'create') {
      createMutation.mutate(form)
    } else if (editItemId) {
      updateMutation.mutate({ id: editItemId, f: form })
    }
  }

  const activeFiltersCount = [programFilter, categoryFilter, supplierFilter, vendorFilter, productTypeFilter, showInactive ? 'inactive' : null, search].filter(Boolean).length

  return (
    <div className="flex flex-col h-full p-6 gap-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Item Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage the product catalog</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImportFile} />
          <a href={exportCatalogUrl({ search: search || undefined, programId: programFilter ?? undefined, categoryId: categoryFilter ?? undefined, supplierId: supplierFilter ?? undefined, vendorId: vendorFilter ?? undefined, isActive: showInactive ? undefined : true })} download="catalog.csv">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export CSV</Button>
          </a>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 w-48"
          />
        </div>

        <Select value={programFilter?.toString() ?? 'all'} onValueChange={v => { setProgramFilter(v === 'all' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Program" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Programs</SelectItem>
            {programs?.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryFilter?.toString() ?? 'all'} onValueChange={v => { setCategoryFilter(v === 'all' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.filter(c => c.isActive).map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={supplierFilter?.toString() ?? 'all'} onValueChange={v => { setSupplierFilter(v === 'all' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Supplier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {suppliers?.filter(s => s.isActive).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={vendorFilter?.toString() ?? 'all'} onValueChange={v => { setVendorFilter(v === 'all' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Vendor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Vendors</SelectItem>
            {vendors?.filter(v => v.isActive).map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={productTypeFilter?.toString() ?? 'all'} onValueChange={v => { setProductTypeFilter(v === 'all' ? null : Number(v)); setPage(1) }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Product Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Product Types</SelectItem>
            {productTypes?.map(pt => <SelectItem key={pt.id} value={String(pt.id)}>{pt.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Checkbox id="inactive" checked={showInactive} onCheckedChange={v => { setShowInactive(!!v); setPage(1) }} />
          <label htmlFor="inactive" className="text-sm cursor-pointer">Show inactive</label>
        </div>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={resetFilters}><X className="h-4 w-4 mr-1" /> Clear filters</Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-3 py-2 bg-muted rounded-md border">
          <span className="text-sm font-medium">{selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected</span>
          <Button size="sm" variant="outline" onClick={() => setBulkSheetOpen(true)}>Bulk Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}><X className="h-4 w-4 mr-1" /> Clear</Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-md overflow-auto flex-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.size > 0 && selectedIds.size === (catalogData?.items.length ?? 0)}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Vendor SKU</TableHead>
              <TableHead>Purchase Desc</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>UOM</TableHead>
              <TableHead>UOM Type</TableHead>
              <TableHead>Product Types</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalogLoading ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(14)].map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : catalogData?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={14} className="text-center text-muted-foreground py-8">
                  No items found. Try adjusting your filters or add a new item.
                </TableCell>
              </TableRow>
            ) : (
              catalogData?.items.map(item => (
                <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(item)}>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => toggleSelected(item.id)} />
                  </TableCell>
                  <TableCell className="font-medium max-w-[200px] truncate">{item.itemName}</TableCell>
                  <TableCell className="text-sm max-w-[140px]">
                    {item.categories.length === 0 ? '—' : (
                      <div className="flex flex-wrap gap-1">
                        {item.categories.map(c => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{item.supplier ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.vendor ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.vendorItemNumber ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.purchaseUomDescription ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.purchaseAmountPerUom ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.purchaseUomAbbreviation ?? '—'}</TableCell>
                  <TableCell className="text-sm">{item.uomType ?? '—'}</TableCell>
                  <TableCell className="text-sm max-w-[120px]">
                    {item.productTypes.length === 0 ? '—' : (
                      <div className="flex flex-wrap gap-1">
                        {item.productTypes.map(pt => <Badge key={pt} variant="secondary" className="text-xs">{pt}</Badge>)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.programName ? (
                      <div className="flex items-center gap-1.5">
                        {item.programColor && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.programColor }} />}
                        <span className="text-sm">{item.programName}</span>
                      </div>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? 'secondary' : 'outline'} className={item.isActive ? '' : 'text-muted-foreground'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Button size="sm" variant="destructive" className="h-7 px-2" onClick={() => { if (confirm('Delete this item?')) deleteMutation.mutate(item.id) }}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {(catalogData?.totalCount ?? 0) > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {showingFrom}–{showingTo} of {catalogData?.totalCount}</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Item Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!open) { setSheetOpen(false); setEditItemId(null) } }}>
        <SheetContent className="w-[520px] sm:max-w-[520px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{sheetMode === 'create' ? 'Add Catalog Item' : 'Edit Catalog Item'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>Item Name *</Label>
              <Input value={form.itemName} onChange={e => setForm(f => ({ ...f, itemName: e.target.value }))} placeholder="Item name" required />
            </div>

            <div className="space-y-1">
              <Label>Program</Label>
              <Select value={form.programId?.toString() ?? 'none'} onValueChange={v => setForm(f => ({ ...f, programId: v === 'none' ? null : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {programs?.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Supplier</Label>
                  <button type="button" onClick={() => setSupplierDialogOpen(true)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> New
                  </button>
                </div>
                <Select value={form.supplierId?.toString() ?? 'none'} onValueChange={v => setForm(f => ({ ...f, supplierId: v === 'none' ? null : Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {suppliers?.filter(s => s.isActive).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label>Vendor</Label>
                  <button type="button" onClick={() => setVendorDialogOpen(true)} className="text-xs text-primary hover:underline flex items-center gap-0.5">
                    <Plus className="h-3 w-3" /> New
                  </button>
                </div>
                <Select value={form.vendorId?.toString() ?? 'none'} onValueChange={v => setForm(f => ({ ...f, vendorId: v === 'none' ? null : Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors?.filter(v => v.isActive).map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Vendor Item Number (SKU)</Label>
              <Input value={form.vendorItemNumber} onChange={e => setForm(f => ({ ...f, vendorItemNumber: e.target.value }))} placeholder="Optional SKU" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Purchase UOM Description</Label>
                <Input value={form.purchaseUomDescription} onChange={e => setForm(f => ({ ...f, purchaseUomDescription: e.target.value }))} placeholder="e.g. 25 kg Bag" />
              </div>
              <div className="space-y-1">
                <Label>Amount per UOM</Label>
                <Input type="number" step="any" value={form.purchaseAmountPerUom} onChange={e => setForm(f => ({ ...f, purchaseAmountPerUom: e.target.value }))} placeholder="e.g. 25" />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Purchase UOM</Label>
              <Select value={form.purchaseUomId?.toString() ?? 'none'} onValueChange={v => setForm(f => ({ ...f, purchaseUomId: v === 'none' ? null : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {uoms?.filter(u => u.isActive).map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.abbreviation}) — {u.unitCategory}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Ingredient Categories */}
            {categories && categories.filter(c => c.isActive).length > 0 && (
              <div className="space-y-2">
                <Label>Ingredient Categories</Label>
                <div className="flex flex-wrap gap-2">
                  {categories.filter(c => c.isActive).map(c => (
                    <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                      <Checkbox
                        checked={form.categoryIds.includes(c.id)}
                        onCheckedChange={checked => setForm(f => ({
                          ...f,
                          categoryIds: checked ? [...f.categoryIds, c.id] : f.categoryIds.filter(id => id !== c.id)
                        }))}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Product Types */}
            <div className="space-y-2">
              <Label>Product Types</Label>
              <div className="flex flex-wrap gap-2">
                {productTypes?.map(pt => (
                  <label key={pt.id} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={form.productTypeIds.includes(pt.id)}
                      onCheckedChange={checked => setForm(f => ({
                        ...f,
                        productTypeIds: checked ? [...f.productTypeIds, pt.id] : f.productTypeIds.filter(id => id !== pt.id)
                      }))}
                    />
                    <span className="text-sm">{pt.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
              {sheetMode === 'edit' && (
                <div className="flex items-center gap-2 pt-6">
                  <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                  <Label>Active</Label>
                </div>
              )}
            </div>

            <SheetFooter>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {sheetMode === 'create' ? 'Create Item' : 'Save Changes'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Quick-Create Supplier Dialog */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (newSupplierName.trim()) createSupplierMutation.mutate(newSupplierName.trim()) }} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input autoFocus value={newSupplierName} onChange={e => setNewSupplierName(e.target.value)} placeholder="Supplier name" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSupplierDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createSupplierMutation.isPending || !newSupplierName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick-Create Vendor Dialog */}
      <Dialog open={vendorDialogOpen} onOpenChange={setVendorDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Vendor</DialogTitle></DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (newVendorName.trim()) createVendorMutation.mutate(newVendorName.trim()) }} className="space-y-3 mt-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input autoFocus value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Vendor name" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setVendorDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createVendorMutation.isPending || !newVendorName.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Sheet */}
      <Sheet open={bulkSheetOpen} onOpenChange={setBulkSheetOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>Bulk Edit — {selectedIds.size} Items</SheetTitle></SheetHeader>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Only fields you set here will be changed. Leave blank to keep existing values. Use "Clear" (0) to remove an assignment.</p>

            <div className="space-y-1">
              <Label>Program</Label>
              <Select value={bulkForm.programId?.toString() ?? 'unchanged'} onValueChange={v => setBulkForm(f => ({ ...f, programId: v === 'unchanged' ? undefined : v === 'clear' ? 0 : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Unchanged</SelectItem>
                  <SelectItem value="clear">Clear (remove)</SelectItem>
                  {programs?.filter(p => p.isActive).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Supplier</Label>
              <Select value={bulkForm.supplierId?.toString() ?? 'unchanged'} onValueChange={v => setBulkForm(f => ({ ...f, supplierId: v === 'unchanged' ? undefined : v === 'clear' ? 0 : Number(v) }))}>
                <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Unchanged</SelectItem>
                  <SelectItem value="clear">Clear (remove)</SelectItem>
                  {suppliers?.filter(s => s.isActive).map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Vendor</Label>
              <Select value={bulkForm.vendorId?.toString() ?? 'unchanged'} onValueChange={f => setBulkForm(b => ({ ...b, vendorId: f === 'unchanged' ? undefined : f === 'clear' ? 0 : Number(f) }))}>
                <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Unchanged</SelectItem>
                  <SelectItem value="clear">Clear (remove)</SelectItem>
                  {vendors?.filter(v => v.isActive).map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={bulkForm.isActive?.toString() ?? 'unchanged'} onValueChange={v => setBulkForm(f => ({ ...f, isActive: v === 'unchanged' ? undefined : v === 'true' }))}>
                <SelectTrigger><SelectValue placeholder="Unchanged" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unchanged">Unchanged</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              disabled={bulkMutation.isPending || Object.keys(bulkForm).length === 0}
              onClick={() => bulkMutation.mutate({ itemIds: Array.from(selectedIds), ...bulkForm })}
            >
              Apply to {selectedIds.size} Items
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
