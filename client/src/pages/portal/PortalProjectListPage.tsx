import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, ChevronRight } from 'lucide-react'
import { getPortalProjects } from '@/api/portal'
import JourneyProgressStepper from '@/components/shared/JourneyProgressStepper'

export default function PortalProjectListPage() {
  const navigate = useNavigate()
  const { data: projects, isLoading } = useQuery({
    queryKey: ['portal-projects'],
    queryFn: getPortalProjects,
  })

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-semibold mb-1">My Projects</h1>
      <p className="text-sm text-muted-foreground mb-6">Your active implementation projects</p>

      {!projects?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">No projects assigned yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Contact your implementation specialist to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map(project => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/portal/${project.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {project.programName && (
                        <div className="flex items-center gap-1.5">
                          {project.programColor && (
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.programColor }} />
                          )}
                          <span className="text-sm text-muted-foreground">{project.programName}</span>
                        </div>
                      )}
                      {project.status && (
                        <Badge variant="outline" className="text-xs">{project.status}</Badge>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                </div>
              </CardHeader>
              <CardContent>
                {project.hasJourney && project.stageProgress.length > 0 ? (
                  <JourneyProgressStepper stages={project.stageProgress} compact />
                ) : (
                  <p className="text-sm text-muted-foreground">No journey assigned yet.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
