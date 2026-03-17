import type { StageProgressDto } from '@/api/projectPortal'
import { CheckCircle2, Circle, Clock } from 'lucide-react'

interface Props {
  stages: StageProgressDto[]
  compact?: boolean  // smaller version for project list cards
}

export default function JourneyProgressStepper({ stages, compact = false }: Props) {
  const standardStages = stages.filter(s => s.stageCategory === 'Standard')

  if (standardStages.length === 0) return null

  return (
    <div className={`flex items-start gap-0 w-full overflow-x-auto ${compact ? 'py-1' : 'py-3'}`}>
      {standardStages.map((stage, index) => (
        <div key={stage.stageId} className="flex items-center flex-1 min-w-0">
          {/* Stage node */}
          <div className={`flex flex-col items-center flex-shrink-0 ${compact ? 'gap-1' : 'gap-2'}`}>
            {/* Icon / status indicator */}
            <div
              className={`rounded-full flex items-center justify-center ${compact ? 'w-6 h-6' : 'w-9 h-9'}`}
              style={{
                backgroundColor: stage.status === 'Complete'
                  ? (stage.color ?? '#22c55e')
                  : stage.status === 'InProgress'
                  ? (stage.color ?? '#6366f1') + '33'
                  : '#e5e7eb',
                border: stage.status !== 'Complete' ? `2px solid ${stage.color ?? (stage.status === 'InProgress' ? '#6366f1' : '#d1d5db')}` : 'none',
              }}
            >
              {stage.status === 'Complete' ? (
                <CheckCircle2 className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-white`} style={{ color: stage.color ? 'white' : '#16a34a' }} />
              ) : stage.status === 'InProgress' ? (
                <Clock className={`${compact ? 'w-3 h-3' : 'w-4 h-4'}`} style={{ color: stage.color ?? '#6366f1' }} />
              ) : (
                <Circle className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-400`} />
              )}
            </div>
            {/* Stage name */}
            {!compact && (
              <div className="text-center max-w-[80px]">
                <p className="text-xs font-medium leading-tight truncate">{stage.stageName}</p>
                {stage.totalItems > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">{stage.completedItems}/{stage.totalItems}</p>
                )}
              </div>
            )}
          </div>
          {/* Connector line between stages */}
          {index < standardStages.length - 1 && (
            <div
              className={`flex-1 ${compact ? 'h-0.5' : 'h-0.5'} mx-1`}
              style={{
                backgroundColor: stage.status === 'Complete' ? (stage.color ?? '#22c55e') : '#e5e7eb',
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
