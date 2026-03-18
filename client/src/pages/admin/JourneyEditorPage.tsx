import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Plus, Pencil, Trash2, Check, X,
  ChevronUp, ChevronDown, Calendar, FileText, ClipboardList,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getJourney, updateJourney,
  addStage, updateStage, deleteStage, reorderStages,
  addItem, updateItem, deleteItem, reorderItems,
} from '@/api/journeys'
import type {
  JourneyDetailDto, JourneyStageDto, JourneyItemDto,
  CreateStagePayload, UpdateStagePayload,
  CreateItemPayload, UpdateItemPayload,
} from '@/api/journeys'
import { getForms } from '@/api/forms'
import type { FormListDto } from '@/api/forms'
import { getJourneyStageCategories } from '@/api/journeyStageCategories'
import type { JourneyStageCategoryDto } from '@/api/journeyStageCategories'
import { getMeetingCatalog } from '@/api/meetingCatalog'
import type { MeetingCatalogEntryDto } from '@/api/meetingCatalog'
import { getResourceCatalog } from '@/api/resourceCatalog'
import type { ResourceCatalogEntryDto } from '@/api/resourceCatalog'
import { getMeetingTypes } from '@/api/meetingTypes'
import type { MeetingTypeDto } from '@/api/meetingTypes'
import { getResourceTypes } from '@/api/resourceTypes'
import type { ResourceTypeDto } from '@/api/resourceTypes'
import ProgramSelect from '@/components/shared/ProgramSelect'
import { useAuthStore } from '@/store/authStore'

// ── Item type badge ────────────────────────────────────────────────────────

function ItemTypeBadge({ type }: { type: string }) {
  if (type === 'Meeting')
    return (
      <Badge className="text-xs gap-1 bg-blue-600 hover:bg-blue-600">
        <Calendar className="h-3 w-3" /> Meeting
      </Badge>
    )
  if (type === 'Resource')
    return (
      <Badge className="text-xs gap-1 bg-green-600 hover:bg-green-600">
        <FileText className="h-3 w-3" /> Resource
      </Badge>
    )
  return (
    <Badge className="text-xs gap-1 bg-orange-500 hover:bg-orange-500">
      <ClipboardList className="h-3 w-3" /> Form
    </Badge>
  )
}

// ── Stage category badge ───────────────────────────────────────────────────

function StageCategoryBadge({ categoryName }: { categoryName: string | null }) {
  if (!categoryName) return null
  return <Badge variant="outline" className="text-xs">{categoryName}</Badge>
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function JourneyEditorPage() {
  const { journeyId } = useParams<{ journeyId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'

  const jId = Number(journeyId)

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: journey, isLoading } = useQuery({
    queryKey: ['journey', jId],
    queryFn: () => getJourney(jId),
    enabled: !isNaN(jId),
  })

  const { data: forms = [] } = useQuery<FormListDto[]>({
    queryKey: ['forms'],
    queryFn: getForms,
    enabled: isAdmin,
  })

  const { data: stageCategories = [] } = useQuery<JourneyStageCategoryDto[]>({
    queryKey: ['journey-stage-categories'],
    queryFn: getJourneyStageCategories,
  })

  // ── Invalidation helper ──────────────────────────────────────────────────

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['journey', jId] })
    qc.invalidateQueries({ queryKey: ['journeys'] })
  }

  // ── Journey mutations ────────────────────────────────────────────────────

  const updateJourneyMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateJourney>[1]) => updateJourney(jId, payload),
    onSuccess: () => { invalidate(); toast.success('Journey updated') },
    onError: () => toast.error('Failed to update journey'),
  })

  // ── Stage mutations ──────────────────────────────────────────────────────

  const addStageMutation = useMutation({
    mutationFn: (payload: CreateStagePayload) => addStage(jId, payload),
    onSuccess: () => { invalidate(); toast.success('Stage added') },
    onError: () => toast.error('Failed to add stage'),
  })

  const updateStageMutation = useMutation({
    mutationFn: ({ stageId, ...payload }: { stageId: number } & UpdateStagePayload) =>
      updateStage(jId, stageId, payload),
    onSuccess: () => { invalidate(); toast.success('Stage updated') },
    onError: () => toast.error('Failed to update stage'),
  })

  const deleteStageMutation = useMutation({
    mutationFn: (stageId: number) => deleteStage(jId, stageId),
    onSuccess: () => { invalidate(); toast.success('Stage deleted') },
    onError: () => toast.error('Failed to delete stage'),
  })

  const reorderStagesMutation = useMutation({
    mutationFn: (orderedIds: number[]) => reorderStages(jId, orderedIds),
    onSuccess: () => { invalidate() },
    onError: () => toast.error('Failed to reorder stages'),
  })

  // ── Item mutations ────────────────────────────────────────────────────────

  const addItemMutation = useMutation({
    mutationFn: ({ stageId, ...payload }: { stageId: number } & CreateItemPayload) =>
      addItem(jId, stageId, payload),
    onSuccess: () => { invalidate(); toast.success('Item added') },
    onError: () => toast.error('Failed to add item'),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ stageId, itemId, ...payload }: { stageId: number; itemId: number } & UpdateItemPayload) =>
      updateItem(jId, stageId, itemId, payload),
    onSuccess: () => { invalidate(); toast.success('Item updated') },
    onError: () => toast.error('Failed to update item'),
  })

  const deleteItemMutation = useMutation({
    mutationFn: ({ stageId, itemId }: { stageId: number; itemId: number }) =>
      deleteItem(jId, stageId, itemId),
    onSuccess: () => { invalidate(); toast.success('Item deleted') },
    onError: () => toast.error('Failed to delete item'),
  })

  const reorderItemsMutation = useMutation({
    mutationFn: ({ stageId, orderedIds }: { stageId: number; orderedIds: number[] }) =>
      reorderItems(jId, stageId, orderedIds),
    onSuccess: () => { invalidate() },
    onError: () => toast.error('Failed to reorder items'),
  })

  // ── Stage reorder helpers ─────────────────────────────────────────────────

  const moveStageUp = (stage: JourneyStageDto) => {
    if (!journey) return
    const sorted = [...journey.stages].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(s => s.id === stage.id)
    if (idx <= 0) return
    const ids = sorted.map(s => s.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    reorderStagesMutation.mutate(ids)
  }

  const moveStageDown = (stage: JourneyStageDto) => {
    if (!journey) return
    const sorted = [...journey.stages].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(s => s.id === stage.id)
    if (idx < 0 || idx >= sorted.length - 1) return
    const ids = sorted.map(s => s.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    reorderStagesMutation.mutate(ids)
  }

  const moveItemUp = (stageId: number, item: JourneyItemDto, items: JourneyItemDto[]) => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(i => i.id === item.id)
    if (idx <= 0) return
    const ids = sorted.map(i => i.id)
    ;[ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]]
    reorderItemsMutation.mutate({ stageId, orderedIds: ids })
  }

  const moveItemDown = (stageId: number, item: JourneyItemDto, items: JourneyItemDto[]) => {
    const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = sorted.findIndex(i => i.id === item.id)
    if (idx < 0 || idx >= sorted.length - 1) return
    const ids = sorted.map(i => i.id)
    ;[ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]]
    reorderItemsMutation.mutate({ stageId, orderedIds: ids })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-80" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (!journey) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Journey not found.</p>
        <Button variant="ghost" onClick={() => navigate('/admin/journeys')} className="mt-2">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Journeys
        </Button>
      </div>
    )
  }

  const sortedStages = [...journey.stages].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate('/admin/journeys')} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Journeys
      </Button>

      {/* Journey header */}
      <JourneyHeader
        journey={journey}
        isAdmin={isAdmin}
        onUpdate={payload => updateJourneyMutation.mutate(payload)}
        isPending={updateJourneyMutation.isPending}
      />

      {/* Stages */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Stages
            <span className="text-muted-foreground font-normal text-sm ml-2">({sortedStages.length})</span>
          </h2>
          {isAdmin && (
            <AddStageButton
              onAdd={payload => addStageMutation.mutate(payload)}
              isPending={addStageMutation.isPending}
              stageCategories={stageCategories}
            />
          )}
        </div>

        {sortedStages.length === 0 ? (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground">No stages yet.</p>
            {isAdmin && <p className="text-xs text-muted-foreground mt-1">Add a stage to get started.</p>}
          </div>
        ) : (
          sortedStages.map((stage, idx) => (
            <StageCard
              key={stage.id}
              stage={stage}
              isFirst={idx === 0}
              isLast={idx === sortedStages.length - 1}
              isAdmin={isAdmin}
              forms={forms}
              stageCategories={stageCategories}
              onMoveUp={() => moveStageUp(stage)}
              onMoveDown={() => moveStageDown(stage)}
              onUpdateStage={payload => updateStageMutation.mutate({ stageId: stage.id, ...payload })}
              onDeleteStage={() => {
                if (confirm(`Delete stage "${stage.name}"? All items in this stage will be deleted.`))
                  deleteStageMutation.mutate(stage.id)
              }}
              onAddItem={payload => addItemMutation.mutate({ stageId: stage.id, ...payload })}
              onUpdateItem={(itemId, payload) => updateItemMutation.mutate({ stageId: stage.id, itemId, ...payload })}
              onDeleteItem={itemId => deleteItemMutation.mutate({ stageId: stage.id, itemId })}
              onMoveItemUp={(item) => moveItemUp(stage.id, item, stage.items)}
              onMoveItemDown={(item) => moveItemDown(stage.id, item, stage.items)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ── Journey Header ────────────────────────────────────────────────────────

function JourneyHeader({
  journey,
  isAdmin,
  onUpdate,
  isPending,
}: {
  journey: JourneyDetailDto
  isAdmin: boolean
  onUpdate: (payload: Parameters<typeof updateJourney>[1]) => void
  isPending: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: journey.name, description: journey.description ?? '' })

  if (editing && isAdmin) {
    return (
      <div className="space-y-3 p-4 border rounded-md bg-muted/30">
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Textarea
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2}
            className="resize-none"
          />
        </div>
        <ProgramSelect
          value={journey.programId ?? null}
          onChange={pid => onUpdate({ programId: pid })}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!form.name.trim() || isPending}
            onClick={() => {
              onUpdate({ name: form.name.trim(), description: form.description.trim() || undefined })
              setEditing(false)
            }}
          >
            <Check className="h-3.5 w-3.5 mr-1" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2 group pb-4 border-b">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{journey.name}</h1>
            {!journey.isActive && <Badge variant="secondary">Inactive</Badge>}
            {journey.programName && <Badge variant="outline">{journey.programName}</Badge>}
          </div>
          {journey.description
            ? <p className="text-sm text-muted-foreground mt-0.5">{journey.description}</p>
            : <p className="text-xs text-muted-foreground italic mt-0.5">No description</p>
          }
          {journey.tags && (
            <p className="text-xs text-muted-foreground mt-1">Tags: {journey.tags}</p>
          )}
        </div>
        {isAdmin && (
          <Button
            size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              setForm({ name: journey.name, description: journey.description ?? '' })
              setEditing(true)
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {isAdmin && (
        <div className="flex items-center gap-2 pt-1">
          <Switch
            id="journey-active-editor"
            checked={journey.isActive}
            onCheckedChange={checked => onUpdate({ isActive: checked })}
          />
          <Label htmlFor="journey-active-editor" className="text-sm cursor-pointer">Active</Label>
        </div>
      )}
    </div>
  )
}

// ── Add Stage Button ──────────────────────────────────────────────────────

function AddStageButton({
  onAdd,
  isPending,
  stageCategories,
}: {
  onAdd: (payload: CreateStagePayload) => void
  isPending: boolean
  stageCategories: JourneyStageCategoryDto[]
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateStagePayload>({
    name: '',
    description: '',
    stageCategoryId: null,
    sortOrder: 0,
  })

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-1" />
        Add Stage
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Stage</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!form.name?.trim()) { toast.error('Name is required'); return }
              onAdd({ ...form, name: form.name.trim() })
              setOpen(false)
              setForm({ name: '', description: '', stageCategoryId: null, sortOrder: 0 })
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Discovery"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description ?? ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stage Category</Label>
              <Select
                value={form.stageCategoryId ? String(form.stageCategoryId) : ''}
                onValueChange={v => setForm(f => ({ ...f, stageCategoryId: v ? Number(v) : null }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.stageCategoryId != null
                      ? (stageCategories.find(c => c.id === form.stageCategoryId)?.name ?? `#${form.stageCategoryId}`)
                      : <span className="text-muted-foreground">Select category</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stageCategories.filter(c => c.isActive).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Color (hex)</Label>
              <Input
                value={form.color ?? ''}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder="#3b82f6"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (lucide name)</Label>
              <Input
                value={form.icon ?? ''}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="e.g. star"
              />
            </div>
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Adding...' : 'Add Stage'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}

// ── Stage Card ────────────────────────────────────────────────────────────

function StageCard({
  stage,
  isFirst,
  isLast,
  isAdmin,
  forms,
  stageCategories,
  onMoveUp,
  onMoveDown,
  onUpdateStage,
  onDeleteStage,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItemUp,
  onMoveItemDown,
}: {
  stage: JourneyStageDto
  isFirst: boolean
  isLast: boolean
  isAdmin: boolean
  forms: FormListDto[]
  stageCategories: JourneyStageCategoryDto[]
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdateStage: (payload: UpdateStagePayload) => void
  onDeleteStage: () => void
  onAddItem: (payload: CreateItemPayload) => void
  onUpdateItem: (itemId: number, payload: UpdateItemPayload) => void
  onDeleteItem: (itemId: number) => void
  onMoveItemUp: (item: JourneyItemDto) => void
  onMoveItemDown: (item: JourneyItemDto) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<UpdateStagePayload>({
    name: stage.name,
    description: stage.description ?? '',
    stageCategoryId: stage.stageCategoryId,
    color: stage.color ?? '',
    icon: stage.icon ?? '',
  })
  const [addItemOpen, setAddItemOpen] = useState(false)

  const sortedItems = [...stage.items].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Stage header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b">
        {stage.color && (
          <div
            className="h-3 w-3 rounded-full shrink-0 border"
            style={{ backgroundColor: stage.color }}
          />
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-1 text-left flex items-center gap-2 min-w-0"
        >
          <span className="font-medium text-sm truncate">{stage.name}</span>
          <StageCategoryBadge categoryName={stage.stageCategoryName} />
          <Badge variant="secondary" className="text-xs shrink-0">
            {stage.items.length} item{stage.items.length !== 1 ? 's' : ''}
          </Badge>
        </button>

        {isAdmin && (
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              onClick={onMoveUp} disabled={isFirst}
              title="Move up"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              onClick={onMoveDown} disabled={isLast}
              title="Move down"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost" className="h-6 w-6"
              onClick={() => {
                setEditForm({
                  name: stage.name,
                  description: stage.description ?? '',
                  stageCategoryId: stage.stageCategoryId,
                  color: stage.color ?? '',
                  icon: stage.icon ?? '',
                })
                setEditing(true)
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="icon" variant="ghost" className="h-6 w-6 text-destructive"
              onClick={onDeleteStage}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Stage edit inline */}
      {editing && isAdmin && (
        <div className="p-3 border-b space-y-3 bg-muted/10">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                className="h-8"
                value={editForm.name ?? ''}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Select
                value={editForm.stageCategoryId ? String(editForm.stageCategoryId) : ''}
                onValueChange={v => setEditForm(f => ({ ...f, stageCategoryId: v ? Number(v) : null }))}
              >
                <SelectTrigger className="h-8">
                  <SelectValue>
                    {editForm.stageCategoryId != null
                      ? (stageCategories.find(c => c.id === editForm.stageCategoryId)?.name ?? `#${editForm.stageCategoryId}`)
                      : <span className="text-muted-foreground">Select category</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {stageCategories.filter(c => c.isActive).map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description</Label>
            <Input
              className="h-8"
              value={editForm.description ?? ''}
              onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Color (hex)</Label>
              <Input
                className="h-8"
                value={editForm.color ?? ''}
                onChange={e => setEditForm(f => ({ ...f, color: e.target.value }))}
                placeholder="#3b82f6"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Icon</Label>
              <Input
                className="h-8"
                value={editForm.icon ?? ''}
                onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => { onUpdateStage(editForm); setEditing(false) }}>
              <Check className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Items */}
      {expanded && (
        <div className="divide-y">
          {sortedItems.length === 0 && (
            <div className="px-4 py-3 text-xs text-muted-foreground italic">
              No items in this stage.
            </div>
          )}
          {sortedItems.map((item, idx) => (
            <ItemCard
              key={item.id}
              item={item}
              isFirst={idx === 0}
              isLast={idx === sortedItems.length - 1}
              isAdmin={isAdmin}
              forms={forms}
              onMoveUp={() => onMoveItemUp(item)}
              onMoveDown={() => onMoveItemDown(item)}
              onUpdate={payload => onUpdateItem(item.id, payload)}
              onDelete={() => {
                if (confirm(`Delete item "${item.title}"?`)) onDeleteItem(item.id)
              }}
            />
          ))}

          {isAdmin && (
            <div className="px-3 py-2">
              <Button size="sm" variant="ghost" className="w-full" onClick={() => setAddItemOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Add Item Sheet */}
      {isAdmin && (
        <AddItemSheet
          open={addItemOpen}
          onClose={() => setAddItemOpen(false)}
          forms={forms}
          onAdd={payload => { onAddItem(payload); setAddItemOpen(false) }}
        />
      )}
    </div>
  )
}

// ── Item Card ─────────────────────────────────────────────────────────────

function ItemCard({
  item,
  isFirst,
  isLast,
  isAdmin,
  forms,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onDelete,
}: {
  item: JourneyItemDto
  isFirst: boolean
  isLast: boolean
  isAdmin: boolean
  forms: FormListDto[]
  onMoveUp: () => void
  onMoveDown: () => void
  onUpdate: (payload: UpdateItemPayload) => void
  onDelete: () => void
}) {
  const [editOpen, setEditOpen] = useState(false)

  const preview = item.itemType === 'Meeting'
    ? item.meetingType ?? ''
    : item.itemType === 'Resource'
    ? item.resourceLabel ?? item.resourceUrl ?? ''
    : item.formName ?? ''

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <ItemTypeBadge type={item.itemType} />
        <div className="min-w-0">
          <span className="text-sm font-medium truncate block">{item.title}</span>
          {preview && (
            <span className="text-xs text-muted-foreground truncate block">{preview}</span>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-0.5 shrink-0">
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveUp} disabled={isFirst}>
            <ChevronUp className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onMoveDown} disabled={isLast}>
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditOpen(true)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}

      {isAdmin && (
        <EditItemSheet
          open={editOpen}
          onClose={() => setEditOpen(false)}
          item={item}
          forms={forms}
          onSave={payload => { onUpdate(payload); setEditOpen(false) }}
        />
      )}
    </div>
  )
}

// ── Add Item Sheet ────────────────────────────────────────────────────────

function AddItemSheet({
  open,
  onClose,
  forms,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  forms: FormListDto[]
  onAdd: (payload: CreateItemPayload) => void
}) {
  const [itemType, setItemType] = useState<'Meeting' | 'Resource' | 'FormAssignment'>('Meeting')
  const [form, setForm] = useState<Partial<CreateItemPayload>>({ title: '', sortOrder: 0 })

  const { data: meetingCatalog = [] } = useQuery<MeetingCatalogEntryDto[]>({
    queryKey: ['meeting-catalog'],
    queryFn: getMeetingCatalog,
    enabled: itemType === 'Meeting',
  })

  const { data: resourceCatalog = [] } = useQuery<ResourceCatalogEntryDto[]>({
    queryKey: ['resource-catalog'],
    queryFn: getResourceCatalog,
    enabled: itemType === 'Resource',
  })

  const { data: meetingTypes = [] } = useQuery<MeetingTypeDto[]>({
    queryKey: ['meeting-types'],
    queryFn: getMeetingTypes,
    enabled: itemType === 'Meeting',
  })

  const { data: resourceTypes = [] } = useQuery<ResourceTypeDto[]>({
    queryKey: ['resource-types'],
    queryFn: getResourceTypes,
    enabled: itemType === 'Resource',
  })

  const reset = () => {
    setItemType('Meeting')
    setForm({ title: '', sortOrder: 0 })
  }

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) { onClose(); reset() } }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add Item</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!form.title?.trim()) { toast.error('Title is required'); return }
            onAdd({ ...form, itemType, title: form.title.trim() } as CreateItemPayload)
            reset()
          }}
          className="space-y-4 mt-4"
        >
          <div className="space-y-1.5">
            <Label>Item Type</Label>
            <Select
              value={itemType}
              onValueChange={v => { setItemType(v as typeof itemType); setForm({ title: '', sortOrder: 0 }) }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Meeting">Meeting</SelectItem>
                <SelectItem value="Resource">Resource</SelectItem>
                <SelectItem value="FormAssignment">Form Assignment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title ?? ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Item title"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          {itemType === 'Meeting' && (
            <>
              {meetingCatalog.filter(e => e.isActive).length > 0 && (
                <div className="space-y-1.5">
                  <Label>Start from catalog</Label>
                  <Select
                    value=""
                    onValueChange={v => {
                      if (!v) return
                      const entry = meetingCatalog.find(e => e.id === Number(v))
                      if (!entry) return
                      setForm(f => ({
                        ...f,
                        title: entry.title,
                        meetingType: entry.meetingType ?? f.meetingType,
                        meetingPurpose: entry.purpose ?? f.meetingPurpose,
                        meetingGoals: entry.goals ?? f.meetingGoals,
                        defaultDurationMinutes: entry.defaultDurationMinutes ?? f.defaultDurationMinutes,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a catalog entry to pre-fill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingCatalog.filter(e => e.isActive).map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Meeting Type</Label>
                <Select
                  value={form.meetingType ?? ''}
                  onValueChange={v => setForm(f => ({ ...f, meetingType: v || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {meetingTypes.filter(t => t.isActive).map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <Textarea
                  value={form.meetingPurpose ?? ''}
                  onChange={e => setForm(f => ({ ...f, meetingPurpose: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goals</Label>
                <Textarea
                  value={form.meetingGoals ?? ''}
                  onChange={e => setForm(f => ({ ...f, meetingGoals: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Default Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.defaultDurationMinutes ?? ''}
                  onChange={e => setForm(f => ({ ...f, defaultDurationMinutes: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="60"
                />
              </div>
            </>
          )}

          {itemType === 'Resource' && (
            <>
              {resourceCatalog.filter(e => e.isActive).length > 0 && (
                <div className="space-y-1.5">
                  <Label>Start from catalog</Label>
                  <Select
                    value=""
                    onValueChange={v => {
                      if (!v) return
                      const entry = resourceCatalog.find(e => e.id === Number(v))
                      if (!entry) return
                      setForm(f => ({
                        ...f,
                        title: entry.title,
                        resourceType: entry.resourceType ?? f.resourceType,
                        resourceUrl: entry.resourceUrl ?? f.resourceUrl,
                        resourceLabel: entry.resourceLabel ?? f.resourceLabel,
                      }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a catalog entry to pre-fill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceCatalog.filter(e => e.isActive).map(e => (
                        <SelectItem key={e.id} value={String(e.id)}>{e.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Resource Type</Label>
                <Select
                  value={form.resourceType ?? ''}
                  onValueChange={v => setForm(f => ({ ...f, resourceType: v || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {resourceTypes.filter(t => t.isActive).map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input
                  value={form.resourceUrl ?? ''}
                  onChange={e => setForm(f => ({ ...f, resourceUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={form.resourceLabel ?? ''}
                  onChange={e => setForm(f => ({ ...f, resourceLabel: e.target.value }))}
                  placeholder="Display label"
                />
              </div>
            </>
          )}

          {itemType === 'FormAssignment' && (
            <div className="space-y-1.5">
              <Label>Form</Label>
              <Select
                value={form.formId ? String(form.formId) : ''}
                onValueChange={v => setForm(f => ({ ...f, formId: v ? Number(v) : undefined }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.formId != null
                      ? (forms.find(f => f.id === form.formId)?.name ?? `#${form.formId}`)
                      : <span className="text-muted-foreground">Select form</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {forms.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { onClose(); reset() }}>
              Cancel
            </Button>
            <Button type="submit">Add Item</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

// ── Edit Item Sheet ───────────────────────────────────────────────────────

function EditItemSheet({
  open,
  onClose,
  item,
  forms,
  onSave,
}: {
  open: boolean
  onClose: () => void
  item: JourneyItemDto
  forms: FormListDto[]
  onSave: (payload: UpdateItemPayload) => void
}) {
  const { data: meetingTypes = [] } = useQuery<MeetingTypeDto[]>({
    queryKey: ['meeting-types'],
    queryFn: getMeetingTypes,
    enabled: item.itemType === 'Meeting',
  })

  const { data: resourceTypes = [] } = useQuery<ResourceTypeDto[]>({
    queryKey: ['resource-types'],
    queryFn: getResourceTypes,
    enabled: item.itemType === 'Resource',
  })

  const [form, setForm] = useState<UpdateItemPayload>({
    title: item.title,
    description: item.description ?? '',
    meetingType: item.meetingType ?? '',
    meetingPurpose: item.meetingPurpose ?? '',
    meetingGoals: item.meetingGoals ?? '',
    defaultDurationMinutes: item.defaultDurationMinutes,
    resourceType: item.resourceType ?? '',
    resourceUrl: item.resourceUrl ?? '',
    resourceLabel: item.resourceLabel ?? '',
    formId: item.formId,
  })

  return (
    <Sheet open={open} onOpenChange={v => { if (!v) onClose() }}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Item</SheetTitle>
        </SheetHeader>
        <form
          onSubmit={e => {
            e.preventDefault()
            if (!form.title?.trim()) { toast.error('Title is required'); return }
            onSave({ ...form, title: form.title?.trim() })
          }}
          className="space-y-4 mt-4"
        >
          <div className="flex items-center gap-2 py-1">
            <ItemTypeBadge type={item.itemType} />
            <span className="text-sm text-muted-foreground">{item.itemType}</span>
          </div>

          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={form.title ?? ''}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={form.description ?? ''}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2}
              className="resize-none"
            />
          </div>

          {item.itemType === 'Meeting' && (
            <>
              <div className="space-y-1.5">
                <Label>Meeting Type</Label>
                <Select
                  value={form.meetingType ?? ''}
                  onValueChange={v => setForm(f => ({ ...f, meetingType: v || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {meetingTypes.filter(t => t.isActive).map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <Textarea
                  value={form.meetingPurpose ?? ''}
                  onChange={e => setForm(f => ({ ...f, meetingPurpose: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Goals</Label>
                <Textarea
                  value={form.meetingGoals ?? ''}
                  onChange={e => setForm(f => ({ ...f, meetingGoals: e.target.value }))}
                  rows={2}
                  className="resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Default Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.defaultDurationMinutes ?? ''}
                  onChange={e => setForm(f => ({ ...f, defaultDurationMinutes: e.target.value ? Number(e.target.value) : undefined }))}
                />
              </div>
            </>
          )}

          {item.itemType === 'Resource' && (
            <>
              <div className="space-y-1.5">
                <Label>Resource Type</Label>
                <Select
                  value={form.resourceType ?? ''}
                  onValueChange={v => setForm(f => ({ ...f, resourceType: v || undefined }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {resourceTypes.filter(t => t.isActive).map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input
                  value={form.resourceUrl ?? ''}
                  onChange={e => setForm(f => ({ ...f, resourceUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Label</Label>
                <Input
                  value={form.resourceLabel ?? ''}
                  onChange={e => setForm(f => ({ ...f, resourceLabel: e.target.value }))}
                />
              </div>
            </>
          )}

          {item.itemType === 'FormAssignment' && (
            <div className="space-y-1.5">
              <Label>Form</Label>
              <Select
                value={form.formId ? String(form.formId) : ''}
                onValueChange={v => setForm(f => ({ ...f, formId: v ? Number(v) : undefined }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.formId != null
                      ? (forms.find(f => f.id === form.formId)?.name ?? `#${form.formId}`)
                      : <span className="text-muted-foreground">Select form</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {forms.map(f => (
                    <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <SheetFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
