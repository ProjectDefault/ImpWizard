import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, Pencil, Trash2, Check, X, Star } from 'lucide-react'
import { toast } from 'sonner'
import {
  getUnitsOfMeasure, getUomConversions,
  createUom, updateUom, deleteUom,
} from '@/api/unitsOfMeasure'
import type { UomDto, CreateUomPayload, UpdateUomPayload } from '@/api/unitsOfMeasure'

// ── Helpers ───────────────────────────────────────────────────────────────────

const SYSTEMS = ['Metric', 'US', 'Universal', 'Imperial'] as const

function formatFactor(n: number): string {
  if (n === 0) return '0'
  if (Number.isInteger(n)) return n.toLocaleString('en-US')
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (Math.abs(n) >= 1) return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 6 })
}

function systemBadgeVariant(system: string): 'default' | 'secondary' | 'outline' {
  if (system === 'Metric') return 'default'
  if (system === 'US' || system === 'Imperial') return 'secondary'
  return 'outline'
}

const EMPTY_FORM: CreateUomPayload = {
  name: '', abbreviation: '', unitCategory: '', system: 'Metric',
  isBaseUnit: false, toBaseMultiplier: 1, sortOrder: 0,
}

// ── Page component ────────────────────────────────────────────────────────────

export default function UnitsOfMeasurePage() {
  const queryClient = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null) // null = create mode
  const [form, setForm] = useState<CreateUomPayload>(EMPTY_FORM)
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerForm, setHeaderForm] = useState({ name: '', abbreviation: '' })

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: units = [], isLoading } = useQuery<UomDto[]>({
    queryKey: ['units-of-measure'],
    queryFn: getUnitsOfMeasure,
  })

  const { data: conversions = [], isLoading: conversionsLoading } = useQuery({
    queryKey: ['units-of-measure', selectedId, 'conversions'],
    queryFn: () => getUomConversions(selectedId!),
    enabled: selectedId !== null,
  })

  const selected = units.find(u => u.id === selectedId) ?? null

  // Group by category
  const grouped = units.reduce<Record<string, UomDto[]>>((acc, u) => {
    (acc[u.unitCategory] ??= []).push(u)
    return acc
  }, {})
  const categoryOrder = Object.keys(grouped).sort()

  // Base unit for the selected unit's category (used in form label)
  const baseUnitForCategory = (cat: string) =>
    units.find(u => u.unitCategory === cat && u.isBaseUnit)

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createUom,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] })
      toast.success('Unit created')
      setSheetOpen(false)
      setForm(EMPTY_FORM)
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create unit'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & UpdateUomPayload) => updateUom(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] })
      queryClient.invalidateQueries({ queryKey: ['units-of-measure', selectedId, 'conversions'] })
      setEditingHeader(false)
      toast.success('Unit updated')
    },
    onError: () => toast.error('Failed to update unit'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units-of-measure'] })
      setSelectedId(null)
      toast.success('Unit deleted')
    },
    onError: () => toast.error('Failed to delete unit'),
  })

  // ── Submit ───────────────────────────────────────────────────────────────────

  function handleSheetSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    if (!form.unitCategory.trim()) { toast.error('Category is required'); return }
    if (!form.isBaseUnit && form.toBaseMultiplier <= 0) {
      toast.error('Conversion factor must be greater than zero'); return
    }
    createMutation.mutate(form)
  }

  // ── Existing categories for datalist ─────────────────────────────────────────

  const existingCategories = [...new Set(units.map(u => u.unitCategory))].sort()

  return (
    <div className="space-y-4 p-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold">Units of Measure</h1>
        <p className="text-sm text-muted-foreground">
          Manage measurement units and their conversions. Conversions are computed automatically from each unit's factor relative to its category's base unit.
        </p>
      </div>

      {/* Two-panel layout */}
      <div className="flex gap-4 h-[calc(100vh-9rem)]">

        {/* Left panel */}
        <div className="w-72 shrink-0 flex flex-col gap-3">
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setForm(EMPTY_FORM)
              setEditingId(null)
              setSheetOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            New Unit
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-0">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : categoryOrder.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">No units yet.</div>
            ) : (
              categoryOrder.map(cat => (
                <div key={cat}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 border-b uppercase tracking-wide">
                    {cat}
                  </div>
                  {grouped[cat].map(u => (
                    <div
                      key={u.id}
                      className={`px-3 py-2.5 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                        selectedId === u.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => { setSelectedId(u.id); setEditingHeader(false) }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium flex-1 truncate">
                          {u.name}
                          {u.abbreviation && (
                            <span className="text-muted-foreground font-normal ml-1">({u.abbreviation})</span>
                          )}
                        </span>
                        {u.isBaseUnit && (
                          <Star className="h-3 w-3 text-amber-500 shrink-0" title="Base unit" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={systemBadgeVariant(u.system)} className="text-xs px-1.5 py-0">
                          {u.system}
                        </Badge>
                        {!u.isActive && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 text-muted-foreground">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId === null || selected === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Select a unit to view its details and conversions</p>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-5 space-y-5 overflow-y-auto">

              {/* Header */}
              {editingHeader ? (
                <div className="space-y-2 pb-4 border-b">
                  <Input
                    className="text-lg font-semibold h-9"
                    value={headerForm.name}
                    onChange={e => setHeaderForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Unit name"
                    autoFocus
                  />
                  <Input
                    className="text-sm"
                    value={headerForm.abbreviation}
                    onChange={e => setHeaderForm(f => ({ ...f, abbreviation: e.target.value }))}
                    placeholder="Abbreviation (optional)"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!headerForm.name.trim() || updateMutation.isPending}
                      onClick={() => updateMutation.mutate({
                        id: selected.id,
                        name: headerForm.name.trim(),
                        abbreviation: headerForm.abbreviation.trim() || undefined,
                      })}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingHeader(false)}>
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group pb-4 border-b">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-semibold">
                          {selected.name}
                          {selected.abbreviation && (
                            <span className="text-muted-foreground font-normal ml-2 text-base">({selected.abbreviation})</span>
                          )}
                        </h2>
                        {selected.isBaseUnit && (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                            <Star className="h-3 w-3" /> Base Unit
                          </Badge>
                        )}
                        {!selected.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
                        <span>{selected.unitCategory}</span>
                        <span>·</span>
                        <Badge variant={systemBadgeVariant(selected.system)} className="text-xs">
                          {selected.system}
                        </Badge>
                        {!selected.isBaseUnit && (
                          <>
                            <span>·</span>
                            <span>
                              1 {selected.abbreviation ?? selected.name} = {formatFactor(selected.toBaseMultiplier)} {baseUnitForCategory(selected.unitCategory)?.abbreviation ?? 'base units'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => {
                          setHeaderForm({ name: selected.name, abbreviation: selected.abbreviation ?? '' })
                          setEditingHeader(true)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(selected.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings (isActive toggle + edit other fields) */}
              <div className="flex flex-wrap gap-6 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Switch
                    id="uom-active"
                    checked={selected.isActive}
                    onCheckedChange={checked => updateMutation.mutate({ id: selected.id, isActive: checked })}
                    disabled={updateMutation.isPending}
                  />
                  <Label htmlFor="uom-active" className="text-sm cursor-pointer">Active</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="uom-base"
                    checked={selected.isBaseUnit}
                    onCheckedChange={checked => updateMutation.mutate({ id: selected.id, isBaseUnit: checked })}
                    disabled={updateMutation.isPending}
                  />
                  <Label htmlFor="uom-base" className="text-sm cursor-pointer">Base unit for {selected.unitCategory}</Label>
                </div>
              </div>

              {/* Conversion factor (inline edit) */}
              {!selected.isBaseUnit && (
                <ConversionFactorEditor
                  unit={selected}
                  baseUnit={baseUnitForCategory(selected.unitCategory)}
                  onSave={factor => updateMutation.mutate({ id: selected.id, toBaseMultiplier: factor })}
                  isPending={updateMutation.isPending}
                />
              )}

              {/* Conversions table */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  Conversions within {selected.unitCategory}
                </h3>
                {conversionsLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : conversions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {selected.isBaseUnit
                      ? 'This is the base unit. Add more units in this category to see conversions.'
                      : 'No other units in this category.'}
                  </p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium">1 {selected.name} equals</th>
                          <th className="text-right px-3 py-2 font-medium">Value</th>
                          <th className="text-left px-3 py-2 font-medium w-24">Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversions.map((c, i) => (
                          <tr key={c.toUnitId} className={i < conversions.length - 1 ? 'border-b' : ''}>
                            <td className="px-3 py-2 text-muted-foreground">{c.toUnitName}</td>
                            <td className="px-3 py-2 text-right tabular-nums font-mono">
                              {formatFactor(c.factor)}
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{c.toUnitAbbreviation ?? ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Unit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Unit of Measure</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSheetSubmit} className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="uom-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="uom-name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Gallon"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="uom-abbr">Abbreviation</Label>
              <Input
                id="uom-abbr"
                value={form.abbreviation ?? ''}
                onChange={e => setForm(f => ({ ...f, abbreviation: e.target.value }))}
                placeholder="e.g. gal"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="uom-category">Category <span className="text-destructive">*</span></Label>
              <Input
                id="uom-category"
                list="uom-category-list"
                value={form.unitCategory}
                onChange={e => setForm(f => ({ ...f, unitCategory: e.target.value }))}
                placeholder="e.g. Volume"
              />
              <datalist id="uom-category-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <Label>System <span className="text-destructive">*</span></Label>
              <Select
                value={form.system}
                onValueChange={v => setForm(f => ({ ...f, system: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select system" />
                </SelectTrigger>
                <SelectContent>
                  {SYSTEMS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3 py-1">
              <Switch
                id="uom-isbase"
                checked={form.isBaseUnit}
                onCheckedChange={v => setForm(f => ({ ...f, isBaseUnit: v, toBaseMultiplier: v ? 1 : f.toBaseMultiplier }))}
              />
              <div>
                <Label htmlFor="uom-isbase" className="cursor-pointer">Base unit</Label>
                <p className="text-xs text-muted-foreground">
                  The reference unit for this category (factor = 1)
                </p>
              </div>
            </div>

            {!form.isBaseUnit && (
              <div className="space-y-1.5">
                <Label htmlFor="uom-factor">
                  Conversion Factor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uom-factor"
                  type="number"
                  step="any"
                  min="0"
                  value={form.toBaseMultiplier}
                  onChange={e => setForm(f => ({ ...f, toBaseMultiplier: Number(e.target.value) }))}
                />
                {form.unitCategory && baseUnitForCategory(form.unitCategory) ? (
                  <p className="text-xs text-muted-foreground">
                    1 {form.name || 'unit'} = {form.toBaseMultiplier} {baseUnitForCategory(form.unitCategory)!.abbreviation ?? baseUnitForCategory(form.unitCategory)!.name}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    How many base units equal 1 of this unit.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="uom-sort">Sort Order</Label>
              <Input
                id="uom-sort"
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Unit'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ── Inline conversion factor editor ──────────────────────────────────────────

function ConversionFactorEditor({
  unit,
  baseUnit,
  onSave,
  isPending,
}: {
  unit: UomDto
  baseUnit: UomDto | undefined
  onSave: (factor: number) => void
  isPending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(unit.toBaseMultiplier)

  if (!editing) {
    return (
      <div className="flex items-center gap-3 py-1 group/factor">
        <span className="text-sm text-muted-foreground">
          1 {unit.abbreviation ?? unit.name} = {formatFactor(unit.toBaseMultiplier)} {baseUnit?.abbreviation ?? 'base'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 px-2 text-xs opacity-0 group-hover/factor:opacity-100 transition-opacity"
          onClick={() => { setValue(unit.toBaseMultiplier); setEditing(true) }}
        >
          <Pencil className="h-3 w-3 mr-1" /> Edit factor
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground shrink-0">1 {unit.abbreviation ?? unit.name} =</span>
      <Input
        type="number"
        step="any"
        min="0"
        value={value}
        onChange={e => setValue(Number(e.target.value))}
        className="h-7 w-36 text-sm"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') { onSave(value); setEditing(false) }
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      <span className="text-sm text-muted-foreground shrink-0">{baseUnit?.abbreviation ?? 'base'}</span>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { onSave(value); setEditing(false) }} disabled={isPending}>
        <Check className="h-3.5 w-3.5 text-green-600" />
      </Button>
      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(false)}>
        <X className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
    </div>
  )
}
