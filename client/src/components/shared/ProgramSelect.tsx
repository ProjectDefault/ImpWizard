import { useQuery } from '@tanstack/react-query'
import { getPrograms } from '@/api/programs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ProgramSelectProps {
  value: number | null | undefined
  onChange: (programId: number | null) => void
  label?: string
  placeholder?: string
  includeUnassigned?: boolean
  className?: string
}

function ColorDot({ color }: { color: string | null }) {
  if (!color) return <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
  return <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
}

export default function ProgramSelect({
  value,
  onChange,
  label = 'Program',
  placeholder = 'None (unassigned)',
  includeUnassigned = true,
  className,
}: ProgramSelectProps) {
  const { data: programs } = useQuery({
    queryKey: ['programs'],
    queryFn: getPrograms,
  })

  const activePrograms = programs?.filter(p => p.isActive) ?? []

  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      {label && <Label>{label}</Label>}
      <Select
        value={value?.toString() ?? 'none'}
        onValueChange={v => onChange(v === 'none' ? null : Number(v))}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder}>
            {value != null ? (
              <div className="flex items-center gap-2">
                <ColorDot color={activePrograms.find(p => p.id === value)?.color ?? null} />
                <span>{activePrograms.find(p => p.id === value)?.name ?? `Program #${value}`}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {includeUnassigned && (
            <SelectItem value="none">
              <span className="text-muted-foreground">{placeholder}</span>
            </SelectItem>
          )}
          {activePrograms.map(p => (
            <SelectItem key={p.id} value={p.id.toString()}>
              <div className="flex items-center gap-2">
                <ColorDot color={p.color} />
                <span>{p.name}</span>
              </div>
            </SelectItem>
          ))}
          {activePrograms.length === 0 && (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">No active programs</div>
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
