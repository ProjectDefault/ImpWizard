import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPortalProject } from '@/api/portal'
import JourneyProgressStepper from '@/components/shared/JourneyProgressStepper'
import PortalTrainingsTab from './tabs/PortalTrainingsTab'
import PortalResourcesTab from './tabs/PortalResourcesTab'
import PortalFormsTab from './tabs/PortalFormsTab'
import PortalPostGoLiveTab from './tabs/PortalPostGoLiveTab'
import PortalTeamTab from './tabs/PortalTeamTab'
import PortalHistoryTab from './tabs/PortalHistoryTab'
import PortalProductListTab from './tabs/PortalProductListTab'
import { useAuthStore } from '@/store/authStore'

export default function PortalProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const id = Number(projectId)

  const { data: project, isLoading } = useQuery({
    queryKey: ['portal-project', id],
    queryFn: () => getPortalProject(id),
    enabled: !!id,
  })

  const isAdminOrCis = user?.role === 'Admin' || user?.role === 'CIS'
  const canManageTeam = isAdminOrCis || user?.role === 'SuperCustomer'
  const showHistory = !isAdminOrCis

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Skeleton className="h-8 w-64 mb-4" />
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!project) return (
    <div className="max-w-6xl mx-auto px-6 py-8 text-center text-muted-foreground">
      Project not found or you don't have access.
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      {/* Back + header */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/portal')} className="gap-1 -ml-2">
          <ArrowLeft className="h-4 w-4" /> Projects
        </Button>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          {project.status && <Badge variant="outline">{project.status}</Badge>}
          {isAdminOrCis && (
            <Badge variant="secondary" className="text-xs">Admin View</Badge>
          )}
        </div>
        {project.programName && (
          <div className="flex items-center gap-1.5 mt-1">
            {project.programColor && (
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.programColor }} />
            )}
            <span className="text-sm text-muted-foreground">{project.programName}</span>
          </div>
        )}

        {/* Stage progress */}
        {project.hasJourney && project.stageProgress.length > 0 && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Journey Progress</p>
            <JourneyProgressStepper stages={project.stageProgress} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trainings">
        <TabsList className="mb-4">
          <TabsTrigger value="trainings">Trainings</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="products">Product List</TabsTrigger>
          <TabsTrigger value="forms">Data Submissions</TabsTrigger>
          <TabsTrigger value="postgolive">Post Go-Live</TabsTrigger>
          {canManageTeam && <TabsTrigger value="team">Team</TabsTrigger>}
          {showHistory && <TabsTrigger value="history">History</TabsTrigger>}
        </TabsList>

        <TabsContent value="trainings">
          <PortalTrainingsTab projectId={id} />
        </TabsContent>
        <TabsContent value="products">
          <PortalProductListTab projectId={id} />
        </TabsContent>
        <TabsContent value="resources">
          <PortalResourcesTab projectId={id} />
        </TabsContent>
        <TabsContent value="forms">
          <PortalFormsTab projectId={id} />
        </TabsContent>
        <TabsContent value="postgolive">
          <PortalPostGoLiveTab projectId={id} />
        </TabsContent>
        {canManageTeam && (
          <TabsContent value="team">
            <PortalTeamTab projectId={id} />
          </TabsContent>
        )}
        {showHistory && (
          <TabsContent value="history">
            <PortalHistoryTab projectId={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
