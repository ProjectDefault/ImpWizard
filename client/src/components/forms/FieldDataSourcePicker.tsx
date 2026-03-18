import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getDataSets } from '@/api/referenceData'
import { getForm } from '@/api/forms'
import type { DataSourceType } from '@/api/forms'

interface Props {
  dataSourceType: DataSourceType
  dataSourceId: number | null
  dataSourceFormId: number | null
  dataSourceFieldId: number | null
  onTypeChange: (type: DataSourceType) => void
  onIdChange: (id: number | null) => void
  onFormIdChange: (id: number | null) => void
  onFieldIdChange: (id: number | null) => void
  allForms: { id: number; name: string }[]
  disabled?: boolean
}

const ITEM_CATALOG_COLUMNS = [
  { id: 1, label: 'Item Name' },
  { id: 2, label: 'Supplier' },
  { id: 3, label: 'Vendor' },
  { id: 4, label: 'Purchase Description' },
]

const UOM_CATEGORIES = [
  { id: null,  label: 'All Units of Measure' },
  { id: 1,     label: 'Volume' },
  { id: 2,     label: 'Weight' },
  { id: 3,     label: 'Count' },
]

export function FieldDataSourcePicker({
  dataSourceType,
  dataSourceId,
  dataSourceFormId,
  dataSourceFieldId,
  onTypeChange,
  onIdChange,
  onFormIdChange,
  onFieldIdChange,
  allForms,
  disabled = false,
}: Props) {
  const { data: datasets = [] } = useQuery({
    queryKey: ['reference-data'],
    queryFn: getDataSets,
    enabled: dataSourceType === 'ReferenceData',
  })

  const { data: sourceForm } = useQuery({
    queryKey: ['forms', dataSourceFormId],
    queryFn: () => getForm(dataSourceFormId!),
    enabled: dataSourceType === 'ProjectSubmission' && dataSourceFormId != null,
  })

  function handleTypeChange(type: DataSourceType) {
    onTypeChange(type)
    onIdChange(null)
    onFormIdChange(null)
    onFieldIdChange(null)
  }

  const sourceFormFields = sourceForm?.fields.filter(f => !f.isArchived) ?? []

  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Data Source</Label>
        <Select
          value={dataSourceType}
          onValueChange={v => handleTypeChange(v as DataSourceType)}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="None">None</SelectItem>
            <SelectItem value="ReferenceData">Reference Data</SelectItem>
            <SelectItem value="ProductType">Product Types</SelectItem>
            <SelectItem value="UnitOfMeasure">Units of Measure</SelectItem>
            <SelectItem value="Category">Categories</SelectItem>
            <SelectItem value="ItemCategory">Ingredient Categories</SelectItem>
            <SelectItem value="ItemCatalog">Item Catalog</SelectItem>
            <SelectItem value="ProjectSubmission">Project Submission</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {dataSourceType === 'ReferenceData' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Dataset</Label>
          <Select
            value={dataSourceId?.toString() ?? ''}
            onValueChange={v => onIdChange(v ? Number(v) : null)}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue>
                {dataSourceId != null
                  ? (datasets.find(ds => ds.id === dataSourceId)?.name ?? `#${dataSourceId}`)
                  : <span className="text-muted-foreground">Select a dataset...</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {datasets.map(ds => (
                <SelectItem key={ds.id} value={ds.id.toString()}>
                  {ds.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {dataSourceType === 'UnitOfMeasure' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Category</Label>
          <Select
            value={dataSourceId?.toString() ?? 'all'}
            onValueChange={v => onIdChange(v === 'all' ? null : Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UOM_CATEGORIES.map(c => (
                <SelectItem key={c.id ?? 'all'} value={c.id?.toString() ?? 'all'}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {dataSourceType === 'ProductType' && (
        <p className="text-xs text-muted-foreground">All active product types will be shown.</p>
      )}

      {dataSourceType === 'Category' && (
        <p className="text-xs text-muted-foreground">All active categories will be shown.</p>
      )}

      {dataSourceType === 'ItemCatalog' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Column</Label>
          <Select
            value={dataSourceId?.toString() ?? '1'}
            onValueChange={v => onIdChange(Number(v))}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue>
                {ITEM_CATALOG_COLUMNS.find(c => c.id === (dataSourceId ?? 1))?.label ?? 'Item Name'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {ITEM_CATALOG_COLUMNS.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {dataSourceType === 'ProjectSubmission' && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Source Form</Label>
            <Select
              value={dataSourceFormId?.toString() ?? ''}
              onValueChange={v => { onFormIdChange(v ? Number(v) : null); onFieldIdChange(null) }}
              disabled={disabled}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue>
                  {dataSourceFormId != null
                    ? (allForms.find(f => f.id === dataSourceFormId)?.name ?? `#${dataSourceFormId}`)
                    : <span className="text-muted-foreground">Select a form...</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {allForms.map(f => (
                  <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {dataSourceFormId != null && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Source Field</Label>
              <Select
                value={dataSourceFieldId?.toString() ?? ''}
                onValueChange={v => onFieldIdChange(v ? Number(v) : null)}
                disabled={disabled || sourceFormFields.length === 0}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue>
                    {dataSourceFieldId != null
                      ? (sourceFormFields.find(f => f.id === dataSourceFieldId)?.label ?? `#${dataSourceFieldId}`)
                      : <span className="text-muted-foreground">{sourceFormFields.length === 0 ? 'No fields available' : 'Select a field...'}</span>}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {sourceFormFields.map(f => (
                    <SelectItem key={f.id} value={f.id.toString()}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Options are populated from submitted answers on this project. If no submissions exist yet, the dropdown will be empty.
          </p>
        </>
      )}
    </div>
  )
}
