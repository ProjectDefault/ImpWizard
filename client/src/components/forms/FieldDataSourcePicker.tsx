import { useQuery } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getDataSets } from '@/api/referenceData'
import type { DataSourceType } from '@/api/forms'

interface Props {
  dataSourceType: DataSourceType
  dataSourceId: number | null
  onTypeChange: (type: DataSourceType) => void
  onIdChange: (id: number | null) => void
  disabled?: boolean
}

const UOM_CATEGORIES = [
  { id: null,  label: 'All Units of Measure' },
  { id: 1,     label: 'Volume' },
  { id: 2,     label: 'Weight' },
  { id: 3,     label: 'Count' },
]

export function FieldDataSourcePicker({
  dataSourceType,
  dataSourceId,
  onTypeChange,
  onIdChange,
  disabled = false,
}: Props) {
  const { data: datasets = [] } = useQuery({
    queryKey: ['reference-data'],
    queryFn: getDataSets,
    enabled: dataSourceType === 'ReferenceData',
  })

  function handleTypeChange(type: DataSourceType) {
    onTypeChange(type)
    onIdChange(null) // reset id when type changes
  }

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
              <SelectValue placeholder="Select a dataset..." />
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
    </div>
  )
}
