import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileSpreadsheet, Download, Trash2, FileDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  getImportTemplates, getImportTemplate, deleteImportTemplate,
  createImportTemplateFromDataManagement, getExportUrl, updateImportTemplate,
} from '@/api/importTemplates'
import type { ImportTemplateSourceType } from '@/api/importTemplates'
import ProgramSelect from '@/components/shared/ProgramSelect'

const DATA_MANAGEMENT_SOURCES: { value: string; label: string }[] = [
  { value: 'ReferenceData', label: 'Reference Data' },
  { value: 'ProductType', label: 'Product Types' },
  { value: 'UnitOfMeasure', label: 'Units of Measure' },
  { value: 'Category', label: 'Categories' },
]

const SOURCE_TYPE_LABELS: Record<string, string> = {
  Form: 'From Form',
  ReferenceData: 'Reference Data',
  ProductType: 'Product Types',
  UnitOfMeasure: 'Units of Measure',
  Category: 'Categories',
  Manual: 'Manual',
}

function SourceBadge({ sourceType }: { sourceType: ImportTemplateSourceType }) {
  const label = SOURCE_TYPE_LABELS[sourceType] ?? sourceType
  const isForm = sourceType === 'Form'
  return (
    <Badge
      variant="outline"
      className={`text-xs px-1.5 py-0 ${isForm ? 'border-blue-300 text-blue-700' : 'border-green-300 text-green-700'}`}
    >
      {label}
    </Badge>
  )
}

export default function ImportTemplatesPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [filter, setFilter] = useState<'all' | 'forms' | 'data'>('all')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [newSource, setNewSource] = useState('ReferenceData')
  const [newName, setNewName] = useState('')

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['import-templates'],
    queryFn: getImportTemplates,
  })

  const { data: selected, isLoading: detailLoading } = useQuery({
    queryKey: ['import-templates', selectedId],
    queryFn: () => getImportTemplate(selectedId!),
    enabled: selectedId !== null,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteImportTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-templates'] })
      setSelectedId(null)
      toast.success('Template deleted')
    },
    onError: () => toast.error('Failed to delete template'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & Parameters<typeof updateImportTemplate>[1]) =>
      updateImportTemplate(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['import-templates'] })
      qc.invalidateQueries({ queryKey: ['import-templates', selectedId] })
    },
    onError: () => toast.error('Failed to update template'),
  })

  const createFromDataMutation = useMutation({
    mutationFn: createImportTemplateFromDataManagement,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ['import-templates'] })
      setSelectedId(id)
      setSheetOpen(false)
      setNewName('')
      toast.success('Import template created')
    },
    onError: () => toast.error('Failed to create template'),
  })

  const filtered = templates.filter(t => {
    if (filter === 'forms') return t.sourceType === 'Form'
    if (filter === 'data') return t.sourceType !== 'Form' && t.sourceType !== 'Manual'
    return true
  })

  function handleExport(format: 'xlsx' | 'csv') {
    if (!selectedId) return
    const url = getExportUrl(selectedId, format, selected?.name)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selected?.name ?? 'template'}.${format}`
    a.click()
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Import Templates</h1>
          <p className="text-sm text-muted-foreground">
            Downloadable column templates for bulk data import
          </p>
        </div>
        <Button size="sm" onClick={() => {
          setNewSource('ReferenceData')
          setNewName('')
          setSheetOpen(true)
        }}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          New from Data Management
        </Button>
      </div>

      <div className="flex gap-4 h-[calc(100vh-10rem)]">
        {/* Left panel */}
        <div className="w-80 shrink-0 flex flex-col gap-3">
          <Tabs value={filter} onValueChange={v => setFilter(v as typeof filter)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
              <TabsTrigger value="forms" className="flex-1 text-xs">From Forms</TabsTrigger>
              <TabsTrigger value="data" className="flex-1 text-xs">Data Mgmt</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="rounded-md border overflow-hidden flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-0">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-3 border-b last:border-b-0">
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No templates yet.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Publish a form or create one from Data Management.
                </p>
              </div>
            ) : (
              filtered.map(t => (
                <div
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                    selectedId === t.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    <SourceBadge sourceType={t.sourceType} />
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {t.columnCount} {t.columnCount === 1 ? 'column' : 'columns'}
                    </span>
                    {t.formName && (
                      <span className="text-xs text-muted-foreground truncate">· {t.formName}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedId === null ? (
            <div className="flex-1 rounded-md border flex items-center justify-center">
              <div className="text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select a template to view and export</p>
              </div>
            </div>
          ) : detailLoading ? (
            <div className="flex-1 rounded-md border p-4 space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selected ? (
            <div className="flex-1 rounded-md border p-4 space-y-4 overflow-y-auto">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-semibold truncate">{selected.name}</h2>
                    <SourceBadge sourceType={selected.sourceType} />
                  </div>
                  {selected.formName && (
                    <p className="text-xs text-muted-foreground mt-0.5">Linked form: {selected.formName}</p>
                  )}
                  {selected.description && (
                    <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => handleExport('xlsx')}>
                    <FileDown className="h-3.5 w-3.5 mr-1.5" />
                    Export .xlsx
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Export .csv
                  </Button>
                  <Button
                    size="icon" variant="ghost" className="h-8 w-8"
                    onClick={() => {
                      if (confirm(`Delete "${selected.name}"? This cannot be undone.`))
                        deleteMutation.mutate(selected.id)
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>

              {/* Column list */}
              <div>
                <h3 className="text-sm font-medium mb-2">
                  Columns
                  <span className="text-muted-foreground font-normal ml-1.5">({selected.columns.length})</span>
                </h3>
                {selected.columns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No columns defined.</p>
                ) : (
                  <div className="rounded-md border divide-y">
                    {selected.columns.map((col) => (
                      <div key={col.id} className="flex items-center gap-3 px-3 py-2">
                        <span className="text-sm font-medium flex-1 truncate">{col.header}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {col.isRequired && (
                            <span className="text-xs text-destructive font-medium">Required</span>
                          )}
                          {col.maxLength && (
                            <span className="text-xs text-muted-foreground">max {col.maxLength}</span>
                          )}
                          <Badge variant="outline" className="text-xs px-1.5 py-0">{col.dataType}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Program assignment */}
              <ProgramSelect
                value={selected.programId}
                onChange={pid => updateMutation.mutate({ id: selected.id, programId: pid })}
              />

              {/* Data bridge placeholder */}
              <div className="rounded-md bg-muted/40 border px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium">Data Bridge:</span>{' '}
                {selected.dataBridgeType === 'None'
                  ? 'Not configured — future feature (API, Webhook, SFTP)'
                  : selected.dataBridgeType}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* New from Data Management Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New Template from Data Management</SheetTitle>
          </SheetHeader>
          <form
            onSubmit={e => {
              e.preventDefault()
              if (!newName.trim()) { toast.error('Name is required'); return }
              createFromDataMutation.mutate({ sourceType: newSource, name: newName.trim() })
            }}
            className="space-y-4 mt-4"
          >
            <div className="space-y-1.5">
              <Label>Data Source</Label>
              <Select value={newSource} onValueChange={setNewSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATA_MANAGEMENT_SOURCES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tmpl-name">
                Template Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tmpl-name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Reference Data Import"
                autoFocus
              />
            </div>
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}
                disabled={createFromDataMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createFromDataMutation.isPending}>
                {createFromDataMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
