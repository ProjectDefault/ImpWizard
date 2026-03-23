import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import { Pencil, Trash2, Plus, Package, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import {
  getPackagingTypes, createPackagingType, updatePackagingType, deletePackagingType,
  getPackagingVolumes, createPackagingVolume, updatePackagingVolume, deletePackagingVolume,
  getPackagingStyles, createPackagingStyle, updatePackagingStyle, deletePackagingStyle,
  getPackagingEntries, createPackagingEntry, updatePackagingEntry, deletePackagingEntry,
  importPackagingEntries, getPackagingImportTemplateUrl,
  type PackagingTypeDto, type PackagingVolumeDto, type PackagingStyleDto, type PackagingEntryDto,
} from '@/api/packaging'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'

// ── Label preview helper ──────────────────────────────────────────────────────

function computeLabel(typeName: string, count: string, volumeName: string, styleName: string, hasCount: boolean, hasStyle: boolean) {
  const parts = [typeName]
  if (hasCount && count.trim()) parts.push(count.trim())
  parts.push(volumeName)
  if (hasStyle && styleName) parts.push(styleName)
  return parts.join(' - ')
}

// ── Import dialog ─────────────────────────────────────────────────────────────

function ImportDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const importMutation = useMutation({
    mutationFn: importPackagingEntries,
    onSuccess: (data) => {
      setResult(data)
      onSuccess()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Import failed'),
  })

  function handleClose() {
    setFile(null)
    setResult(null)
    onClose()
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!file) { toast.error('Select a CSV file first'); return }
    importMutation.mutate(file)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import Packaging Entries</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 py-2">
            <div className="rounded-md bg-muted/40 p-4 space-y-1 text-sm">
              <p><span className="font-medium text-green-700">{result.created}</span> entries created</p>
              <p><span className="font-medium text-muted-foreground">{result.skipped}</span> duplicates skipped</p>
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <p className="text-xs font-medium text-destructive">Errors ({result.errors.length})</p>
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">{e}</p>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: <strong>Type, Count, Volume, Style</strong>. Count and Style are optional.
              Types, Volumes, and Styles will be created automatically if they don't already exist.
            </p>
            <a
              href={getPackagingImportTemplateUrl()}
              download="packaging-import-template.csv"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
            >
              <Download className="h-3 w-3" />
              Download CSV template
            </a>
            <div
              className="rounded-md border-2 border-dashed border-muted-foreground/30 p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground/50" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
              <Button type="submit" disabled={!file || importMutation.isPending}>
                {importMutation.isPending ? 'Importing...' : 'Import'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Entries tab ───────────────────────────────────────────────────────────────

function EntriesTab() {
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<PackagingEntryDto | null>(null)

  const { data: entries = [], isLoading } = useQuery({ queryKey: ['packaging-entries'], queryFn: getPackagingEntries })
  const { data: types = [] } = useQuery({ queryKey: ['packaging-types'], queryFn: getPackagingTypes })
  const { data: volumes = [] } = useQuery({ queryKey: ['packaging-volumes'], queryFn: getPackagingVolumes })
  const { data: styles = [] } = useQuery({ queryKey: ['packaging-styles'], queryFn: getPackagingStyles })

  const [typeId, setTypeId] = useState('')
  const [count, setCount] = useState('')
  const [volumeId, setVolumeId] = useState('')
  const [styleId, setStyleId] = useState('')
  const [sortOrder, setSortOrder] = useState('0')

  const selectedType = types.find(t => t.id === Number(typeId))
  const selectedVolume = volumes.find(v => v.id === Number(volumeId))
  const selectedStyle = styles.find(s => s.id === Number(styleId))

  const previewLabel = selectedType && selectedVolume
    ? computeLabel(selectedType.name, count, selectedVolume.name, selectedStyle?.name ?? '', selectedType.hasCount, selectedType.hasStyle)
    : null

  function openCreate() {
    setEditing(null)
    setTypeId('')
    setCount('')
    setVolumeId('')
    setStyleId('')
    setSortOrder('0')
    setSheetOpen(true)
  }

  function openEdit(e: PackagingEntryDto) {
    setEditing(e)
    setTypeId(String(e.packagingTypeId))
    setCount(e.count ?? '')
    setVolumeId(String(e.packagingVolumeId))
    setStyleId(e.packagingStyleId ? String(e.packagingStyleId) : '')
    setSortOrder(String(e.sortOrder))
    setSheetOpen(true)
  }

  function handleTypeChange(val: string) {
    setTypeId(val)
    // Clear count/style if new type doesn't support them
    const t = types.find(t => t.id === Number(val))
    if (t && !t.hasCount) setCount('')
    if (t && !t.hasStyle) setStyleId('')
  }

  const createMutation = useMutation({
    mutationFn: createPackagingEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packaging-entries'] })
      toast.success('Entry created')
      setSheetOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create entry'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...p }: { id: number } & Parameters<typeof updatePackagingEntry>[1]) =>
      updatePackagingEntry(id, p),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packaging-entries'] })
      toast.success('Entry updated')
      setSheetOpen(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update entry'),
  })

  const deleteMutation = useMutation({
    mutationFn: deletePackagingEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packaging-entries'] })
      toast.success('Entry deleted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete entry'),
  })

  const isPending = createMutation.isPending || updateMutation.isPending

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!typeId) { toast.error('Type is required'); return }
    if (!volumeId) { toast.error('Volume is required'); return }
    if (editing) {
      updateMutation.mutate({
        id: editing.id,
        packagingTypeId: Number(typeId),
        count: selectedType?.hasCount && count.trim() ? count.trim() : undefined,
        packagingVolumeId: Number(volumeId),
        packagingStyleId: selectedType?.hasStyle && styleId ? Number(styleId) : undefined,
        sortOrder: Number(sortOrder) || 0,
        clearCount: !selectedType?.hasCount,
        clearStyle: !selectedType?.hasStyle,
      })
    } else {
      createMutation.mutate({
        packagingTypeId: Number(typeId),
        count: selectedType?.hasCount && count.trim() ? count.trim() : undefined,
        packagingVolumeId: Number(volumeId),
        packagingStyleId: selectedType?.hasStyle && styleId ? Number(styleId) : undefined,
        sortOrder: Number(sortOrder) || 0,
      })
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Composed packaging configurations used in forms and product lists.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Entry
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="rounded-md border flex flex-col items-center justify-center h-48 gap-3">
          <Package className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No packaging entries yet.</p>
          <Button size="sm" variant="outline" onClick={openCreate}>Create First Entry</Button>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Label</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-2 font-medium hidden md:table-cell">Volume</th>
                <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Style</th>
                <th className="text-left px-4 py-2 font-medium hidden lg:table-cell">Count</th>
                <th className="text-center px-4 py-2 font-medium">Active</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-2 font-medium">{e.label}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{e.typeName}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">{e.volumeName}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">{e.styleName ?? '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground hidden lg:table-cell">{e.count ?? '—'}</td>
                  <td className="px-4 py-2 text-center">
                    {e.isActive
                      ? <Badge variant="outline" className="text-xs border-green-300 text-green-700">Active</Badge>
                      : <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${e.label}"?`)) deleteMutation.mutate(e.id) }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['packaging-entries'] })
          qc.invalidateQueries({ queryKey: ['packaging-types'] })
          qc.invalidateQueries({ queryKey: ['packaging-volumes'] })
          qc.invalidateQueries({ queryKey: ['packaging-styles'] })
        }}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? 'Edit Entry' : 'New Entry'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Type <span className="text-destructive">*</span></Label>
              <Select value={typeId} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {types.filter(t => t.isActive).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType?.hasCount && (
              <div className="space-y-1.5">
                <Label>Count <span className="text-xs text-muted-foreground">(e.g. 4x6, 24)</span></Label>
                <Input value={count} onChange={e => setCount(e.target.value)} placeholder="4x6" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Volume <span className="text-destructive">*</span></Label>
              <Select value={volumeId} onValueChange={setVolumeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select volume..." />
                </SelectTrigger>
                <SelectContent>
                  {volumes.filter(v => v.isActive).map(v => (
                    <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType?.hasStyle && (
              <div className="space-y-1.5">
                <Label>Style</Label>
                <Select value={styleId} onValueChange={setStyleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {styles.filter(s => s.isActive).map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>

            {previewLabel && (
              <div className="rounded-md bg-muted/40 px-3 py-2 text-sm">
                <span className="text-xs text-muted-foreground">Preview: </span>
                <span className="font-medium">{previewLabel}</span>
              </div>
            )}

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : editing ? 'Save Changes' : 'Create'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ── Generic component sub-catalog section ─────────────────────────────────────

interface SimpleItem { id: number; name: string; sortOrder: number; isActive: boolean }

function SubCatalogSection<T extends SimpleItem>({
  title,
  items,
  onAdd,
  onEdit,
  onDelete,
  extraColumns,
  renderExtraForm,
}: {
  title: string
  items: T[]
  onAdd: (name: string, sortOrder: number, extra: Record<string, unknown>) => void
  onEdit: (item: T, name: string, sortOrder: number, extra: Record<string, unknown>) => void
  onDelete: (item: T) => void
  extraColumns?: { header: string; render: (item: T) => React.ReactNode }[]
  renderExtraForm?: (extra: Record<string, unknown>, setExtra: (k: string, v: unknown) => void) => React.ReactNode
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [name, setName] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [extra, setExtraState] = useState<Record<string, unknown>>({})

  function setExtra(k: string, v: unknown) {
    setExtraState(prev => ({ ...prev, [k]: v }))
  }

  function openAdd() {
    setEditingItem(null)
    setName('')
    setSortOrder('0')
    setExtraState({})
    setSheetOpen(true)
  }

  function openEditItem(item: T) {
    setEditingItem(item)
    setName(item.name)
    setSortOrder(String(item.sortOrder))
    // Seed extra fields from item
    const e: Record<string, unknown> = {}
    for (const key of Object.keys(item) as (keyof T)[]) {
      if (key !== 'id' && key !== 'name' && key !== 'sortOrder' && key !== 'isActive') {
        e[key as string] = item[key]
      }
    }
    setExtraState(e)
    setSheetOpen(true)
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!name.trim()) { toast.error('Name is required'); return }
    if (editingItem) {
      onEdit(editingItem, name.trim(), Number(sortOrder) || 0, extra)
    } else {
      onAdd(name.trim(), Number(sortOrder) || 0, extra)
    }
    setSheetOpen(false)
  }

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={openAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          New
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground px-4 py-3">No {title.toLowerCase()} yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-y">
              <tr>
                <th className="text-left px-4 py-1.5 font-medium text-xs">Name</th>
                {extraColumns?.map(c => (
                  <th key={c.header} className="text-center px-3 py-1.5 font-medium text-xs">{c.header}</th>
                ))}
                <th className="text-center px-3 py-1.5 font-medium text-xs">Active</th>
                <th className="px-3 py-1.5 w-16" />
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-1.5 font-medium">{item.name}</td>
                  {extraColumns?.map(c => (
                    <td key={c.header} className="px-3 py-1.5 text-center">{c.render(item)}</td>
                  ))}
                  <td className="px-3 py-1.5 text-center">
                    {item.isActive
                      ? <span className="text-xs text-green-700">✓</span>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openEditItem(item)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm(`Delete "${item.name}"?`)) onDelete(item) }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>{editingItem ? `Edit ${title.replace(/s$/, '')}` : `New ${title.replace(/s$/, '')}`}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" autoFocus />
            </div>
            {renderExtraForm?.(extra, setExtra)}
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} />
            </div>
            {editingItem && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={extra.isActive as boolean ?? editingItem.isActive}
                  onCheckedChange={v => setExtra('isActive', v)}
                />
                <Label>Active</Label>
              </div>
            )}
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button type="submit">{editingItem ? 'Save Changes' : 'Create'}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </Card>
  )
}

// ── Components tab ────────────────────────────────────────────────────────────

function ComponentsTab() {
  const qc = useQueryClient()

  const { data: types = [] } = useQuery({ queryKey: ['packaging-types'], queryFn: getPackagingTypes })
  const { data: volumes = [] } = useQuery({ queryKey: ['packaging-volumes'], queryFn: getPackagingVolumes })
  const { data: styles = [] } = useQuery({ queryKey: ['packaging-styles'], queryFn: getPackagingStyles })

  // Types mutations
  const createType = useMutation({
    mutationFn: createPackagingType,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-types'] }); qc.invalidateQueries({ queryKey: ['packaging-entries'] }); toast.success('Type created') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
  const updateType = useMutation({
    mutationFn: ({ id, ...p }: { id: number } & Parameters<typeof updatePackagingType>[1]) => updatePackagingType(id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-types'] }); qc.invalidateQueries({ queryKey: ['packaging-entries'] }); toast.success('Type updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
  const deleteType = useMutation({
    mutationFn: (id: number) => deletePackagingType(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-types'] }); toast.success('Type deleted') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete'),
  })

  // Volumes mutations
  const createVolume = useMutation({
    mutationFn: createPackagingVolume,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-volumes'] }); qc.invalidateQueries({ queryKey: ['packaging-entries'] }); toast.success('Volume created') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
  const updateVolume = useMutation({
    mutationFn: ({ id, ...p }: { id: number } & Parameters<typeof updatePackagingVolume>[1]) => updatePackagingVolume(id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-volumes'] }); qc.invalidateQueries({ queryKey: ['packaging-entries'] }); toast.success('Volume updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
  const deleteVolume = useMutation({
    mutationFn: (id: number) => deletePackagingVolume(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-volumes'] }); toast.success('Volume deleted') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete'),
  })

  // Styles mutations
  const createStyle = useMutation({
    mutationFn: createPackagingStyle,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-styles'] }); qc.invalidateQueries({ queryKey: ['packaging-entries'] }); toast.success('Style created') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
  const updateStyle = useMutation({
    mutationFn: ({ id, ...p }: { id: number } & Parameters<typeof updatePackagingStyle>[1]) => updatePackagingStyle(id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-styles'] }); qc.invalidateQueries({ queryKey: ['packaging-entries'] }); toast.success('Style updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed'),
  })
  const deleteStyle = useMutation({
    mutationFn: (id: number) => deletePackagingStyle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['packaging-styles'] }); toast.success('Style deleted') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete'),
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Types */}
      <SubCatalogSection
        title="Types"
        items={types}
        onAdd={(name, sortOrder, extra) => createType.mutate({ name, hasCount: Boolean(extra.hasCount), hasStyle: Boolean(extra.hasStyle), sortOrder })}
        onEdit={(item, name, sortOrder, extra) => updateType.mutate({ id: item.id, name, hasCount: extra.hasCount as boolean, hasStyle: extra.hasStyle as boolean, sortOrder, isActive: extra.isActive as boolean })}
        onDelete={item => deleteType.mutate(item.id)}
        extraColumns={[
          { header: 'Has Count', render: (item: PackagingTypeDto) => item.hasCount ? <span className="text-xs text-green-700">✓</span> : <span className="text-xs text-muted-foreground">—</span> },
          { header: 'Has Style', render: (item: PackagingTypeDto) => item.hasStyle ? <span className="text-xs text-green-700">✓</span> : <span className="text-xs text-muted-foreground">—</span> },
        ]}
        renderExtraForm={(extra, setExtra) => (
          <>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(extra.hasCount)}
                onCheckedChange={v => setExtra('hasCount', v)}
              />
              <Label>Has Count</Label>
              <span className="text-xs text-muted-foreground">(e.g. 4x6)</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={Boolean(extra.hasStyle)}
                onCheckedChange={v => setExtra('hasStyle', v)}
              />
              <Label>Has Style</Label>
              <span className="text-xs text-muted-foreground">(e.g. Can, Bottle)</span>
            </div>
          </>
        )}
      />

      {/* Volumes */}
      <SubCatalogSection
        title="Volumes"
        items={volumes}
        onAdd={(name, sortOrder) => createVolume.mutate({ name, sortOrder })}
        onEdit={(item, name, sortOrder, extra) => updateVolume.mutate({ id: item.id, name, sortOrder, isActive: extra.isActive as boolean })}
        onDelete={item => deleteVolume.mutate(item.id)}
      />

      {/* Styles */}
      <SubCatalogSection
        title="Styles"
        items={styles}
        onAdd={(name, sortOrder) => createStyle.mutate({ name, sortOrder })}
        onEdit={(item, name, sortOrder, extra) => updateStyle.mutate({ id: item.id, name, sortOrder, isActive: extra.isActive as boolean })}
        onDelete={item => deleteStyle.mutate(item.id)}
      />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PackagingPage() {
  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Packaging Types</h1>
        <p className="text-sm text-muted-foreground">
          Manage packaging configurations and the types, volumes, and styles that compose them.
        </p>
      </div>

      <Tabs defaultValue="entries">
        <TabsList>
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="components">Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="mt-4">
          <EntriesTab />
        </TabsContent>
        <TabsContent value="components" className="mt-4">
          <ComponentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
