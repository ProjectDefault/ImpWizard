import { Type, Hash, Calendar, ChevronDown, CheckSquare, AlignLeft } from 'lucide-react'
import type { FieldType } from '@/api/forms'

const icons: Record<FieldType, React.ElementType> = {
  Text:     Type,
  Number:   Hash,
  Date:     Calendar,
  Dropdown: ChevronDown,
  Checkbox: CheckSquare,
  Textarea: AlignLeft,
}

export function FormFieldTypeIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: FieldType
  className?: string
}) {
  const Icon = icons[type] ?? Type
  return <Icon className={className} />
}
