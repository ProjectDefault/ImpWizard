import { Badge } from '@/components/ui/badge'
import type { FieldType } from '@/api/forms'

const config: Record<FieldType, { label: string; className: string }> = {
  Text:     { label: 'Text',     className: 'bg-blue-100 text-blue-800 border-blue-200' },
  Number:   { label: 'Number',   className: 'bg-purple-100 text-purple-800 border-purple-200' },
  Date:     { label: 'Date',     className: 'bg-orange-100 text-orange-800 border-orange-200' },
  Dropdown: { label: 'Dropdown', className: 'bg-green-100 text-green-800 border-green-200' },
  Checkbox: { label: 'Checkbox', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  Textarea: { label: 'Textarea', className: 'bg-slate-100 text-slate-800 border-slate-200' },
}

export function FormFieldTypeBadge({ type }: { type: FieldType }) {
  const { label, className } = config[type] ?? config.Text
  return (
    <Badge variant="outline" className={`text-xs font-normal ${className}`}>
      {label}
    </Badge>
  )
}
