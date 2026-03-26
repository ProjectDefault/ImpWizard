import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Pencil, Trash2, Plus, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  getCatalogItemTypes,
  createCatalogItemType, updateCatalogItemType, deleteCatalogItemType,
  createCatalogItemSubType, updateCatalogItemSubType, deleteCatalogItemSubType,
  createCatalogItemTypeField, updateCatalogItemTypeField,
  type CatalogItemTypeDto, type CatalogItemSubTypeDto, type CatalogItemTypeFieldDto,
} from '@/api/catalogItemTypes'

// ── Types panel ───────────────────────────────────────────────────────────────

interface TypeSheetState {
  open: boolean
  editing: CatalogItemTypeDto | null
  name: string
  description: string
  sortOrder: string
  isActive: boolean
}

function initialTypeSheet(): TypeSheetState {
  return { open: false, editing: null, name: '', description: '', sortOrder: '0', isActive: true }
}

// ── SubTypes panel ────────────────────────────────────────────────────────────

interface SubTypeSheetState {
  open: boolean
  editing: CatalogItemSubTypeDto | null
  name: string
  description: string
  sortOrder: string
  isActive: boolean
}

function initialSubTypeSheet(): SubTypeSheetState {
  return { open: false, editing: null, name: '', description: '', sortOrder: '0', isActive: true }
}

// ── Fields panel ──────────────────────────────────────────────────────────────

interface FieldSheetState {
  open: boolean
  editing: CatalogItemTypeFieldDto | null
  fieldName: string
  fieldLabel: string
  fieldType: 'Text' | 'Number'
  isRequired: boolean
  isActive: boolean
  sortOrder: string
}

function initialFieldSheet(): FieldSheetState {
  return { open: false, editing: null, fieldName: '', fieldLabel: '', fieldType: 'Text', isRequired: false, isActive: true, sortOrder: '0' }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CatalogItemTypesPage() {
  const qc = useQueryClient()
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null)
  const [typeSheet, setTypeSheet] = useState<TypeSheetState>(initialTypeSheet)
  const [subTypeSheet, setSubTypeSheet] = useState<SubTypeSheetState>(initialSubTypeSheet)
  const [fieldSheet, setFieldSheet] = useState<FieldSheetState>(initialFieldSheet)

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['catalog-item-types'],
    queryFn: getCatalogItemTypes,
  })

  const selectedType = types.find(t => t.id === selectedTypeId) ?? null

  // ── Type mutations ──────────────────────────────────────────────────────────

  const createTypeMut = useMutation({
    mutationFn: (p: Parameters<typeof createCatalogItemType>[0]) => createCatalogItemType(p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); setTypeSheet(initialTypeSheet()); toast.success('Type created') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create type'),
  })

  const updateTypeMut = useMutation({
    mutationFn: ({ id, p }: { id: number; p: Parameters<typeof updateCatalogItemType>[1] }) => updateCatalogItemType(id, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); setTypeSheet(initialTypeSheet()); toast.success('Type updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update type'),
  })

  const deleteTypeMut = useMutation({
    mutationFn: deleteCatalogItemType,
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['catalog-item-types'] })
      if (selectedTypeId === id) setSelectedTypeId(null)
      toast.success('Type deleted')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete type'),
  })

  // ── SubType mutations ───────────────────────────────────────────────────────

  const createSubTypeMut = useMutation({
    mutationFn: ({ typeId, p }: { typeId: number; p: Parameters<typeof createCatalogItemSubType>[1] }) =>
      createCatalogItemSubType(typeId, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); setSubTypeSheet(initialSubTypeSheet()); toast.success('Sub-type created') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create sub-type'),
  })

  const updateSubTypeMut = useMutation({
    mutationFn: ({ typeId, subId, p }: { typeId: number; subId: number; p: Parameters<typeof updateCatalogItemSubType>[2] }) =>
      updateCatalogItemSubType(typeId, subId, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); setSubTypeSheet(initialSubTypeSheet()); toast.success('Sub-type updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update sub-type'),
  })

  const deleteSubTypeMut = useMutation({
    mutationFn: ({ typeId, subId }: { typeId: number; subId: number }) => deleteCatalogItemSubType(typeId, subId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); toast.success('Sub-type deleted') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to delete sub-type'),
  })

  // ── Field mutations ─────────────────────────────────────────────────────────

  const createFieldMut = useMutation({
    mutationFn: ({ typeId, p }: { typeId: number; p: Parameters<typeof createCatalogItemTypeField>[1] }) =>
      createCatalogItemTypeField(typeId, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); setFieldSheet(initialFieldSheet()); toast.success('Field created') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to create field'),
  })

  const updateFieldMut = useMutation({
    mutationFn: ({ typeId, fieldId, p }: { typeId: number; fieldId: number; p: Parameters<typeof updateCatalogItemTypeField>[2] }) =>
      updateCatalogItemTypeField(typeId, fieldId, p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['catalog-item-types'] }); setFieldSheet(initialFieldSheet()); toast.success('Field updated') },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed to update field'),
  })

  // ── Type sheet handlers ─────────────────────────────────────────────────────

  function openNewType() {
    setTypeSheet({ open: true, editing: null, name: '', description: '', sortOrder: '0', isActive: true })
  }

  function openEditType(t: CatalogItemTypeDto) {
    setTypeSheet({ open: true, editing: t, name: t.name, description: t.description ?? '', sortOrder: String(t.sortOrder), isActive: t.isActive })
  }

  function submitTypeSheet() {
    const p = { name: typeSheet.name.trim(), description: typeSheet.description.trim() || undefined, sortOrder: Number(typeSheet.sortOrder) || 0, isActive: typeSheet.isActive }
    if (typeSheet.editing) updateTypeMut.mutate({ id: typeSheet.editing.id, p })
    else createTypeMut.mutate(p)
  }

  // ── SubType sheet handlers ──────────────────────────────────────────────────

  function openNewSubType() {
    setSubTypeSheet({ open: true, editing: null, name: '', description: '', sortOrder: '0', isActive: true })
  }

  function openEditSubType(s: CatalogItemSubTypeDto) {
    setSubTypeSheet({ open: true, editing: s, name: s.name, description: s.description ?? '', sortOrder: String(s.sortOrder), isActive: s.isActive })
  }

  function submitSubTypeSheet() {
    if (!selectedTypeId) return
    const p = { name: subTypeSheet.name.trim(), description: subTypeSheet.description.trim() || undefined, sortOrder: Number(subTypeSheet.sortOrder) || 0, isActive: subTypeSheet.isActive }
    if (subTypeSheet.editing) updateSubTypeMut.mutate({ typeId: selectedTypeId, subId: subTypeSheet.editing.id, p })
    else createSubTypeMut.mutate({ typeId: selectedTypeId, p })
  }

  // ── Field sheet handlers ────────────────────────────────────────────────────

  function openNewField() {
    setFieldSheet({ open: true, editing: null, fieldName: '', fieldLabel: '', fieldType: 'Text', isRequired: false, isActive: true, sortOrder: '0' })
  }

  function openEditField(f: CatalogItemTypeFieldDto) {
    setFieldSheet({ open: true, editing: f, fieldName: f.fieldName, fieldLabel: f.fieldLabel, fieldType: f.fieldType, isRequired: f.isRequired, isActive: f.isActive, sortOrder: String(f.sortOrder) })
  }

  function submitFieldSheet() {
    if (!selectedTypeId) return
    const p = {
      fieldName: fieldSheet.fieldName.trim(),
      fieldLabel: fieldSheet.fieldLabel.trim(),
      fieldType: fieldSheet.fieldType,
      isRequired: fieldSheet.isRequired,
      isActive: fieldSheet.isActive,
      sortOrder: Number(fieldSheet.sortOrder) || 0,
    }
    if (fieldSheet.editing) updateFieldMut.mutate({ typeId: selectedTypeId, fieldId: fieldSheet.editing.id, p })
    else createFieldMut.mutate({ typeId: selectedTypeId, p })
  }

  const typeBusy = createTypeMut.isPending || updateTypeMut.isPending
  const subTypeBusy = createSubTypeMut.isPending || updateSubTypeMut.isPending
  const fieldBusy = createFieldMut.isPending || updateFieldMut.isPending

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ingredient Types</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Define ingredient categories (e.g. Hops), their sub-types (e.g. T-90 Pellet), and custom fields (e.g. Alpha Acid %).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Types ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Types</CardTitle>
            <Button size="sm" onClick={openNewType}>
              <Plus className="h-4 w-4 mr-1" /> New Type
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4">Loading…</p>
            ) : types.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No types yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-center px-3 py-2 font-medium">Sort</th>
                    <th className="text-center px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {types.map(t => (
                    <tr
                      key={t.id}
                      className={`border-b hover:bg-muted/30 cursor-pointer transition-colors ${selectedTypeId === t.id ? 'bg-muted/50' : ''}`}
                      onClick={() => setSelectedTypeId(t.id === selectedTypeId ? null : t.id)}
                    >
                      <td className="px-4 py-2 font-medium">
                        <div className="flex items-center gap-1">
                          {t.name}
                          <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${selectedTypeId === t.id ? 'rotate-90' : ''}`} />
                        </div>
                        {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                      </td>
                      <td className="text-center px-3 py-2 text-muted-foreground">{t.sortOrder}</td>
                      <td className="text-center px-3 py-2">
                        {t.isActive ? <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge> : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditType(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete type "${t.name}"?`)) deleteTypeMut.mutate(t.id) }}
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
          </CardContent>
        </Card>

        {/* ── Sub-Types ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {selectedType ? `Sub-Types — ${selectedType.name}` : 'Sub-Types'}
            </CardTitle>
            <Button size="sm" disabled={!selectedType} onClick={openNewSubType}>
              <Plus className="h-4 w-4 mr-1" /> New Sub-Type
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedType ? (
              <p className="text-sm text-muted-foreground p-4">Select a type on the left to manage its sub-types.</p>
            ) : selectedType.subTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No sub-types for "{selectedType.name}" yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-center px-3 py-2 font-medium">Sort</th>
                    <th className="text-center px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {selectedType.subTypes.map(s => (
                    <tr key={s.id} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-2">
                        {s.name}
                        {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
                      </td>
                      <td className="text-center px-3 py-2 text-muted-foreground">{s.sortOrder}</td>
                      <td className="text-center px-3 py-2">
                        {s.isActive ? <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge> : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditSubType(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm(`Delete sub-type "${s.name}"?`)) deleteSubTypeMut.mutate({ typeId: selectedType.id, subId: s.id }) }}
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
          </CardContent>
        </Card>

        {/* ── Fields ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {selectedType ? `Fields — ${selectedType.name}` : 'Fields'}
            </CardTitle>
            <Button size="sm" disabled={!selectedType} onClick={openNewField}>
              <Plus className="h-4 w-4 mr-1" /> New Field
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {!selectedType ? (
              <p className="text-sm text-muted-foreground p-4">Select a type on the left to manage its custom fields.</p>
            ) : selectedType.fields.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4">No fields for "{selectedType.name}" yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 font-medium">Label</th>
                    <th className="text-center px-3 py-2 font-medium">Type</th>
                    <th className="text-center px-3 py-2 font-medium">Req</th>
                    <th className="text-center px-3 py-2 font-medium">Active</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {selectedType.fields.map(f => (
                    <tr key={f.id} className={`border-b hover:bg-muted/30 ${!f.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-2">
                        {f.fieldLabel}
                        <div className="text-xs text-muted-foreground font-mono">{f.fieldName}</div>
                      </td>
                      <td className="text-center px-3 py-2 text-muted-foreground">{f.fieldType}</td>
                      <td className="text-center px-3 py-2">
                        {f.isRequired ? <span className="text-xs text-amber-600 font-medium">Yes</span> : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="text-center px-3 py-2">
                        {f.isActive ? <Badge variant="outline" className="text-green-600 border-green-300">Active</Badge> : <Badge variant="outline" className="text-muted-foreground">Retired</Badge>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditField(f)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Type Sheet ── */}
      <Sheet open={typeSheet.open} onOpenChange={v => !v && setTypeSheet(initialTypeSheet())}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{typeSheet.editing ? 'Edit Type' : 'New Type'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={typeSheet.name} onChange={e => setTypeSheet(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Hops" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={typeSheet.description} onChange={e => setTypeSheet(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={typeSheet.sortOrder} onChange={e => setTypeSheet(p => ({ ...p, sortOrder: e.target.value }))} />
            </div>
            {typeSheet.editing && (
              <div className="flex items-center gap-2">
                <Switch checked={typeSheet.isActive} onCheckedChange={v => setTypeSheet(p => ({ ...p, isActive: v }))} />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setTypeSheet(initialTypeSheet())}>Cancel</Button>
            <Button onClick={submitTypeSheet} disabled={!typeSheet.name.trim() || typeBusy}>
              {typeBusy ? 'Saving…' : typeSheet.editing ? 'Save Changes' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── SubType Sheet ── */}
      <Sheet open={subTypeSheet.open} onOpenChange={v => !v && setSubTypeSheet(initialSubTypeSheet())}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{subTypeSheet.editing ? 'Edit Sub-Type' : `New Sub-Type${selectedType ? ` — ${selectedType.name}` : ''}`}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={subTypeSheet.name} onChange={e => setSubTypeSheet(p => ({ ...p, name: e.target.value }))} placeholder="e.g. T-90 Pellet" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={subTypeSheet.description} onChange={e => setSubTypeSheet(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={subTypeSheet.sortOrder} onChange={e => setSubTypeSheet(p => ({ ...p, sortOrder: e.target.value }))} />
            </div>
            {subTypeSheet.editing && (
              <div className="flex items-center gap-2">
                <Switch checked={subTypeSheet.isActive} onCheckedChange={v => setSubTypeSheet(p => ({ ...p, isActive: v }))} />
                <Label>Active</Label>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSubTypeSheet(initialSubTypeSheet())}>Cancel</Button>
            <Button onClick={submitSubTypeSheet} disabled={!subTypeSheet.name.trim() || subTypeBusy}>
              {subTypeBusy ? 'Saving…' : subTypeSheet.editing ? 'Save Changes' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Field Sheet ── */}
      <Sheet open={fieldSheet.open} onOpenChange={v => !v && setFieldSheet(initialFieldSheet())}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{fieldSheet.editing ? 'Edit Field' : `New Field${selectedType ? ` — ${selectedType.name}` : ''}`}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>Field Label *</Label>
              <Input
                value={fieldSheet.fieldLabel}
                onChange={e => setFieldSheet(p => ({ ...p, fieldLabel: e.target.value }))}
                placeholder="e.g. Alpha Acid %"
              />
            </div>
            <div className="space-y-1">
              <Label>Field Name * <span className="text-xs text-muted-foreground">(machine key, no spaces)</span></Label>
              <Input
                value={fieldSheet.fieldName}
                onChange={e => setFieldSheet(p => ({ ...p, fieldName: e.target.value.replace(/\s+/g, '_').toLowerCase() }))}
                placeholder="e.g. alpha_acid"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label>Field Type *</Label>
              <Select value={fieldSheet.fieldType} onValueChange={(v: 'Text' | 'Number') => setFieldSheet(p => ({ ...p, fieldType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Number">Number</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={fieldSheet.sortOrder} onChange={e => setFieldSheet(p => ({ ...p, sortOrder: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={fieldSheet.isRequired} onCheckedChange={v => setFieldSheet(p => ({ ...p, isRequired: v }))} />
              <Label>Required</Label>
            </div>
            {fieldSheet.editing && (
              <div className="flex items-center gap-2">
                <Switch checked={fieldSheet.isActive} onCheckedChange={v => setFieldSheet(p => ({ ...p, isActive: v }))} />
                <Label>{fieldSheet.isActive ? 'Active' : 'Retired — values are preserved but hidden from item sheets'}</Label>
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setFieldSheet(initialFieldSheet())}>Cancel</Button>
            <Button
              onClick={submitFieldSheet}
              disabled={!fieldSheet.fieldLabel.trim() || !fieldSheet.fieldName.trim() || fieldBusy}
            >
              {fieldBusy ? 'Saving…' : fieldSheet.editing ? 'Save Changes' : 'Create'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
