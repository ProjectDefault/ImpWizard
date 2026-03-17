import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { FileText, Link, Video, ExternalLink, Presentation } from 'lucide-react'
import { getPortalResources, recordResourceView } from '@/api/portal'
import type { PortalResourceDto } from '@/api/portal'

interface Props { projectId: number }

function extractGoogleSlidesEmbedUrl(url: string): string | null {
  // Handles: https://docs.google.com/presentation/d/PRESENTATION_ID/...
  const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
  if (!match) return null
  return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false`
}

function resourceIcon(type?: string) {
  if (type === 'GoogleSlides') return <Presentation className="h-4 w-4" />
  if (type === 'Video') return <Video className="h-4 w-4" />
  if (type === 'Document') return <FileText className="h-4 w-4" />
  return <Link className="h-4 w-4" />
}

function ResourceCard({ resource, projectId }: { resource: PortalResourceDto; projectId: number }) {
  const embedUrl = resource.resourceType === 'GoogleSlides'
    ? extractGoogleSlidesEmbedUrl(resource.resourceUrl)
    : null

  const trackView = () => {
    recordResourceView(projectId, resource.id).catch(() => {/* silent */})
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight flex items-center gap-2">
            {resourceIcon(resource.resourceType)}
            {resource.title}
          </CardTitle>
          {resource.resourceType && (
            <Badge variant="outline" className="text-xs shrink-0">{resource.resourceType}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {embedUrl ? (
          <div className="aspect-video w-full rounded overflow-hidden border">
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allowFullScreen
              title={resource.title}
              onLoad={trackView}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => { trackView(); window.open(resource.resourceUrl, '_blank') }}
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Resource
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function PortalResourcesTab({ projectId }: Props) {
  const { data: resources, isLoading } = useQuery({
    queryKey: ['portal-resources', projectId],
    queryFn: () => getPortalResources(projectId),
  })

  if (isLoading) return <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full" />)}</div>

  if (!resources?.length) {
    return <div className="py-16 text-center text-muted-foreground">No resources available yet.</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {resources.map(r => <ResourceCard key={r.id} resource={r} projectId={projectId} />)}
    </div>
  )
}
