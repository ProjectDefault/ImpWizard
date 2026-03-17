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
  getCatalogItemTypes, getCatalogItemType, createCatalogItemType, updateCatalogItemType, deleteCatalogItemType,
  addSubType, updateSubType, deleteSubType,
  addTypeField, updateTypeField, deleteTypeField,
} from '@/api/catalogItemTypes'
import type { CatalogItemTypeListDto, CatalogItemTypeDetailDto, SubTypeDto, TypeFieldDto } from '@/api/catalogItemTypes'

type FieldType = 'Text' | 'Number' | 'Boolean'

export default function CatalogItemTypesPage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true })

  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true })

  // SubType inline editing
  const [addingSubType, setAddingSubType] = useState(false)
  const [newSubType, setNewSubType] = useState({ name: '', description: '', sortOrder: 0, isActive: true })
  const [editingSubTypeId, setEditingSubTypeId] = useState<number | null>(null)
  const [editSubTypeForm, setEditSubTypeForm] = useState({ name: '', description: '', sortOrder: 0, isActive: true })

  // Field inline editing
  const [addingField, setAddingField] = useState(false)
  const [newField, setNewField] = useState({ fieldName: '', fieldLabel: '', fieldType: 'Text' as FieldType, isRequired: false, sortOrder: 0 })
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null)
  const [editFieldForm, setEditFieldForm] = useState({ fieldName: '', fieldLabel: '', fieldType: 'Text' as FieldType, isRequired: false, sortOrder: 0 })

  // --- Queries ---
  const { data: types, isLoading: typesLoading } = useQuery<CatalogItemTypeListDto[]>({
    queryKey: ['catalog-item-types'],
    queryFn: getCatalogItemTypes,
  })

  const { data: type, isLoading: typeLoading } = useQuery<CatalogItemTypeDetailDto>({
    queryKey: ['catalog-item-types', selectedId],
    queryFn: () => getCatalogItemType(selectedId!),
    enabled: selectedId !== null,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['catalog-item-types'] })
    queryClient.invalidateQueries({ queryKey: ['catalog-item-types', selectedId] })
  }

  // --- Type Mutations ---
  const createMutation = useMutation({
    mutationFn: createCatalogItemType,
    onSuccess: (created) => {
      invalidate()
      toast.success('Item Type created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', sortOrder: 0, isActive: true })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create item type'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & typeof headerForm) => updateCatalogItemType(id, payload),
    onSuccess: () => { invalidate(); setEditingHeader(false); toast.success('Updated') },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCatalogItemType,
    onSuccess: () => { invalidate(); setSelectedId(null); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  // --- SubType Mutations ---
  const addSubTypeMutation = useMutation({
    mutationFn: ({ typeId, ...payload }: { typeId: number } & typeof newSubType) => addSubType(typeId, payload),
    onSuccess: () => { invalidate(); setAddingSubType(false); setNewSubType({ name: '', description: '', sortOrder: 0, isActive: true }); toast.success('Sub-type added') },
    onError: () => toast.error('Failed to add sub-type'),
  })

  const updateSubTypeMutation = useMutation({
    mutationFn: ({ typeId, subId, ...payload }: { typeId: number; subId: number } & typeof editSubTypeForm) => updateSubType(typeId, subId, payload),
    onSuccess: () => { invalidate(); setEditingSubTypeId(null); toast.success('Sub-type updated') },
    onError: () => toast.error('Failed to update sub-type'),
  })

  const deleteSubTypeMutation = useMutation({
    mutationFn: ({ typeId, subId }: { typeId: number; subId: number }) => deleteSubType(typeId, subId),
    onSuccess: () => { invalidate(); toast.success('Sub-type deleted') },
    onError: () => toast.error('Failed to delete sub-type'),
  })

  // --- Field Mutations ---
  const addFieldMutation = useMutation({
    mutationFn: ({ typeId, ...payload }: { typeId: number } & typeof newField) => addTypeField(typeId, payload),
    onSuccess: () => { invalidate(); setAddingField(false); setNewField({ fieldName: '', fieldLabel: '', fieldType: 'Text', isRequired: false, sortOrder: 0 }); toast.success('Field added') },
    onError: () => toast.error('Failed to add field'),
  })

  const updateFieldMutation = useMutation({
    mutationFn: ({ typeId, fieldId, ...payload }: { typeId: number; fieldId: number } & typeof editFieldForm) => updateTypeField(typeId, fieldId, payload),
    onSuccess: () => { invalidate(); setEditingFieldId(null); toast.success('Field updated') },
    onError: () => toast.error('Failed to update field'),
  })

  const deleteFieldMutation = useMutation({
    mutationFn: ({ typeId, fieldId }: { typeId: number; fieldId: number }) => deleteTypeField(typeId, fieldId),
    onSuccess: () => { invalidate(); toast.success('Field deleted') },
    onError: () => toast.error('Failed to delete field'),
  })

  const startEditSubType = (sub: SubTypeDto) => {
    setEditSubTypeForm({ name: sub.name, description: sub.description ?? '', sortOrder: sub.sortOrder, isActive: sub.isActive })
    setEditingSubTypeId(sub.id)
  }

  const startEditField = (f: TypeFieldDto) => {
    setEditFieldForm({ fieldName: f.fieldName, fieldLabel: f.fieldLabel, fieldType: f.fieldType, isRequired: f.isRequired, sortOrder: f.sortOrder })
    setEditingFieldId(f.id)
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Item Types</h1>
        <p className="text-sm text-muted-foreground">Manage catalog item types, sub-types, and custom fields</p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button size="sm" className="w-full" onClick={() => { setSheetForm({ name: '', description: '', sortOrder: 0, isActive: true }); setSheetOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> New Item Type
          </Button>
          <div className="border rounded-md overflow-y-auto flex-1">
            {typesLoading ? (
              <div className="p-3 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : types?.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No item types yet</p>
            ) : (
              types?.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between gap-2 border-b last:border-0 ${selectedId === t.id ? 'bg-muted' : ''}`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{t.name}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary">{t.subTypeCount} sub</Badge>
                    <Badge variant="outline">{t.fieldCount} fields</Badge>
                    {!t.isActive && <Badge variant="outline" className="text-muted-foreground">Off</Badge>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-1 border rounded-md p-4 overflow-y-auto space-y-6">
          {!selectedId ? (
            <p className="text-muted-foreground text-sm">Select an item type to view details</p>
          ) : typeLoading ? (
            <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-4 w-48" /></div>
          ) : type ? (
            <>
              {/* Header */}
              {editingHeader ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={headerForm.name} onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Description</Label>
                    <Input value={headerForm.description} onChange={e => setHeaderForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Sort Order</Label>
                    <Input type="number" value={headerForm.sortOrder} onChange={e => setHeaderForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={headerForm.isActive} onCheckedChange={v => setHeaderForm(f => ({ ...f, isActive: v }))} />
                    <Label>Active</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateMutation.mutate({ id: type.id, ...headerForm })} disabled={updateMutation.isPending}>
                      <Check className="h-4 w-4 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingHeader(false)}><X className="h-4 w-4 mr-1" /> Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{type.name}</h2>
                    {type.description && <p className="text-sm text-muted-foreground">{type.description}</p>}
                    {!type.isActive && <Badge variant="outline" className="mt-1">Inactive</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setHeaderForm({ name: type.name, description: type.description ?? '', sortOrder: type.sortOrder, isActive: type.isActive }); setEditingHeader(true) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { if (confirm('Delete this item type? All sub-types and items will be affected.')) deleteMutation.mutate(type.id) }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Sub-Types */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Sub-Types ({type.subTypes.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => setAddingSubType(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>

                {addingSubType && (
                  <div className="border rounded p-3 mb-2 space-y-2 bg-muted/30">
                    <Input placeholder="Sub-type name" value={newSubType.name} onChange={e => setNewSubType(f => ({ ...f, name: e.target.value }))} />
                    <Input placeholder="Description (optional)" value={newSubType.description} onChange={e => setNewSubType(f => ({ ...f, description: e.target.value }))} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { if (!newSubType.name.trim()) { toast.error('Name required'); return } addSubTypeMutation.mutate({ typeId: type.id, ...newSubType }) }} disabled={addSubTypeMutation.isPending}>
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingSubType(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}

                <div className="border rounded-md divide-y">
                  {type.subTypes.length === 0 && !addingSubType ? (
                    <p className="p-3 text-sm text-muted-foreground">No sub-types</p>
                  ) : type.subTypes.map(sub => (
                    <div key={sub.id} className="px-3 py-2">
                      {editingSubTypeId === sub.id ? (
                        <div className="space-y-2">
                          <Input value={editSubTypeForm.name} onChange={e => setEditSubTypeForm(f => ({ ...f, name: e.target.value }))} />
                          <Input placeholder="Description" value={editSubTypeForm.description} onChange={e => setEditSubTypeForm(f => ({ ...f, description: e.target.value }))} />
                          <div className="flex items-center gap-2">
                            <Switch checked={editSubTypeForm.isActive} onCheckedChange={v => setEditSubTypeForm(f => ({ ...f, isActive: v }))} />
                            <Label className="text-xs">Active</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateSubTypeMutation.mutate({ typeId: type.id, subId: sub.id, ...editSubTypeForm })} disabled={updateSubTypeMutation.isPending}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingSubTypeId(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium">{sub.name}</span>
                            {sub.description && <span className="text-xs text-muted-foreground ml-2">{sub.description}</span>}
                            {!sub.isActive && <Badge variant="outline" className="ml-2 text-xs">Inactive</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditSubType(sub)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete sub-type?')) deleteSubTypeMutation.mutate({ typeId: type.id, subId: sub.id }) }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Custom Fields ({type.fields.length})</h3>
                  <Button size="sm" variant="outline" onClick={() => setAddingField(true)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Field
                  </Button>
                </div>

                {addingField && (
                  <div className="border rounded p-3 mb-2 space-y-2 bg-muted/30">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Field Name (key)</Label>
                        <Input placeholder="e.g. alpha_acid" value={newField.fieldName} onChange={e => setNewField(f => ({ ...f, fieldName: e.target.value }))} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Display Label</Label>
                        <Input placeholder="e.g. Alpha Acid %" value={newField.fieldLabel} onChange={e => setNewField(f => ({ ...f, fieldLabel: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Field Type</Label>
                        <Select value={newField.fieldType} onValueChange={v => setNewField(f => ({ ...f, fieldType: v as FieldType }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Text">Text</SelectItem>
                            <SelectItem value="Number">Number</SelectItem>
                            <SelectItem value="Boolean">Boolean (Yes/No)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={newField.isRequired} onCheckedChange={v => setNewField(f => ({ ...f, isRequired: v }))} />
                        <Label className="text-xs">Required</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => { if (!newField.fieldName.trim() || !newField.fieldLabel.trim()) { toast.error('Field name and label required'); return } addFieldMutation.mutate({ typeId: type.id, ...newField }) }} disabled={addFieldMutation.isPending}>
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingField(false)}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}

                <div className="border rounded-md divide-y">
                  {type.fields.length === 0 && !addingField ? (
                    <p className="p-3 text-sm text-muted-foreground">No custom fields — items of this type have no extra attributes</p>
                  ) : type.fields.map(field => (
                    <div key={field.id} className="px-3 py-2">
                      {editingFieldId === field.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Field Name</Label>
                              <Input value={editFieldForm.fieldName} onChange={e => setEditFieldForm(f => ({ ...f, fieldName: e.target.value }))} />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Display Label</Label>
                              <Input value={editFieldForm.fieldLabel} onChange={e => setEditFieldForm(f => ({ ...f, fieldLabel: e.target.value }))} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select value={editFieldForm.fieldType} onValueChange={v => setEditFieldForm(f => ({ ...f, fieldType: v as FieldType }))}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Text">Text</SelectItem>
                                <SelectItem value="Number">Number</SelectItem>
                                <SelectItem value="Boolean">Boolean</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2">
                              <Switch checked={editFieldForm.isRequired} onCheckedChange={v => setEditFieldForm(f => ({ ...f, isRequired: v }))} />
                              <Label className="text-xs">Required</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => updateFieldMutation.mutate({ typeId: type.id, fieldId: field.id, ...editFieldForm })} disabled={updateFieldMutation.isPending}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingFieldId(null)}><X className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <span className="text-sm font-medium">{field.fieldLabel}</span>
                              <span className="text-xs text-muted-foreground ml-2">({field.fieldName})</span>
                            </div>
                            <Badge variant="outline" className="text-xs">{field.fieldType}</Badge>
                            {field.isRequired && <Badge variant="secondary" className="text-xs">Required</Badge>}
                          </div>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditField(field)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { if (confirm('Delete this field? All item values for this field will be deleted.')) deleteFieldMutation.mutate({ typeId: type.id, fieldId: field.id }) }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader><SheetTitle>New Item Type</SheetTitle></SheetHeader>
          <form onSubmit={e => { e.preventDefault(); if (!sheetForm.name.trim()) { toast.error('Name is required'); return } createMutation.mutate(sheetForm) }} className="space-y-4 mt-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={sheetForm.name} onChange={e => setSheetForm(f => ({ ...f, name: e.target.value }))} placeholder="Item type name" required />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={sheetForm.description} onChange={e => setSheetForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
            </div>
            <div className="space-y-1">
              <Label>Sort Order</Label>
              <Input type="number" value={sheetForm.sortOrder} onChange={e => setSheetForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={sheetForm.isActive} onCheckedChange={v => setSheetForm(f => ({ ...f, isActive: v }))} />
              <Label>Active</Label>
            </div>
            <SheetFooter>
              <Button type="submit" disabled={createMutation.isPending}>Create Item Type</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
