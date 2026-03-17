import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Map, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { getJourneys, createJourney, updateJourney } from '@/api/journeys'
import type { CreateJourneyPayload, JourneyListDto } from '@/api/journeys'
import ProgramSelect from '@/components/shared/ProgramSelect'

export default function JourneysPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetForm, setSheetForm] = useState<CreateJourneyPayload>({
    name: '',
    description: '',
    isActive: true,
  })

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: journeys = [], isLoading } = useQuery({
    queryKey: ['journeys'],
    queryFn: getJourneys,
  })

  const selected = journeys.find(j => j.id === selectedId) ?? null

  // ── Mutations ──────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: createJourney,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['journeys'] })
      toast.success('Journey created')
      setSheetOpen(false)
      setSheetForm({ name: '', description: '', isActive: true })
      setSelectedId(created.id)
    },
    onError: () => toast.error('Failed to create journey'),
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      updateJourney(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['journeys'] })
      toast.success('Journey updated')
    },
    onError: () => toast.error('Failed to update journey'),
  })

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Journeys</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage journey templates for implementation projects
        </p>
      </div>

      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Button size="sm" onClick={() => {
            setSheetForm({ name: '', description: '', isActive: true })
            setSheetOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" />
            New Journey
          </Button>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-0">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                ))}
              </div>
            ) : journeys.length === 0 ? (
              <div className="p-6 text-center">
                <Map className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No journeys yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Create one to get started.</p>
              </div>
            ) : (
              journeys.map(j => (
                <JourneyRow
                  key={j.id}
                  journey={j}
                  isSelected={selectedId === j.id}
                  onSelect={() => setSelectedId(j.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selected === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <div className="text-center">
                <Map className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a journey to view its details</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              <div className="flex items-start justify-between gap-2 pb-3 border-b">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-semibold truncate">{selected.name}</h2>
                    {!selected.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {selected.programName && (
                      <Badge variant="outline">{selected.programName}</Badge>
                    )}
                  </div>
                  {selected.description
                    ? <p className="text-sm text-muted-foreground mt-0.5">{selected.description}</p>
                    : <p className="text-xs text-muted-foreground italic mt-0.5">No description</p>
                  }
                </div>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{selected.stageCount} stage{selected.stageCount !== 1 ? 's' : ''}</span>
                {selected.programName && (
                  <span>Program: {selected.programName}</span>
                )}
              </div>

              {/* Active toggle + Open Editor */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    id="journey-active"
                    checked={selected.isActive}
                    onCheckedChange={checked =>
                      toggleActiveMutation.mutate({ id: selected.id, isActive: checked })
                    }
                    disabled={toggleActiveMutation.isPending}
                  />
                  <Label htmlFor="journey-active" className="text-sm cursor-pointer">Active</Label>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/admin/journeys/${selected.id}`)}
                >
                  Open Editor
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Journey Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Journey</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!sheetForm.name?.trim()) { toast.error('Name is required'); return }
              createMutation.mutate(sheetForm)
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="journey-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="journey-name"
                value={sheetForm.name}
                onChange={e => setSheetForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Standard Onboarding"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="journey-description">Description</Label>
              <Textarea
                id="journey-description"
                value={sheetForm.description ?? ''}
                onChange={e => setSheetForm(p => ({ ...p, description: e.target.value }))}
                placeholder="What does this journey cover?"
                rows={3}
                className="resize-none"
              />
            </div>
            <ProgramSelect
              value={sheetForm.programId ?? null}
              onChange={pid => setSheetForm(p => ({ ...p, programId: pid ?? undefined }))}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="sheet-active"
                checked={sheetForm.isActive ?? true}
                onCheckedChange={v => setSheetForm(p => ({ ...p, isActive: v }))}
              />
              <Label htmlFor="sheet-active" className="cursor-pointer">Active</Label>
            </div>
            <SheetFooter className="pt-2">
              <Button
                type="button" variant="outline"
                onClick={() => setSheetOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Journey'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function JourneyRow({
  journey,
  isSelected,
  onSelect,
}: {
  journey: JourneyListDto
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${isSelected ? 'bg-muted' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{journey.name}</span>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {journey.stageCount} stage{journey.stageCount !== 1 ? 's' : ''}
          </Badge>
          {journey.programName && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {journey.programName}
            </Badge>
          )}
          {!journey.isActive && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">Inactive</Badge>
          )}
        </div>
      </div>
      {journey.description && (
        <p className="text-xs text-muted-foreground truncate mt-0.5">{journey.description}</p>
      )}
    </div>
  )
}
