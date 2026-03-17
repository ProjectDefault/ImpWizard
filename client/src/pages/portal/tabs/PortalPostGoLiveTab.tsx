import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, HeartHandshake, Wrench, FileText, Link, Video, Presentation } from 'lucide-react'
import { getPortalPostGoLiveResources } from '@/api/portal'
import type { PortalResourceDto } from '@/api/portal'

interface Props { projectId: number }

function resourceIcon(type?: string) {
  if (type === 'CustomerSuccess') return <HeartHandshake className="h-5 w-5 text-pink-500" />
  if (type === 'TechnicalSupport') return <Wrench className="h-5 w-5 text-blue-500" />
  if (type === 'GoogleSlides') return <Presentation className="h-5 w-5 text-orange-500" />
  if (type === 'Video') return <Video className="h-5 w-5 text-purple-500" />
  if (type === 'Document') return <FileText className="h-5 w-5 text-muted-foreground" />
  return <Link className="h-5 w-5 text-muted-foreground" />
}

function typeLabel(type?: string) {
  if (type === 'CustomerSuccess') return 'Customer Success'
  if (type === 'TechnicalSupport') return 'Technical Support'
  return type ?? 'Resource'
}

export default function PortalPostGoLiveTab({ projectId }: Props) {
  const { data: resources, isLoading } = useQuery({
    queryKey: ['portal-postgolive', projectId],
    queryFn: () => getPortalPostGoLiveResources(projectId),
  })

  if (isLoading) return <div className="grid gap-4 sm:grid-cols-2">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>

  if (!resources?.length) {
    return <div className="py-16 text-center text-muted-foreground">No post go-live resources available yet.</div>
  }

  const supportResources = resources.filter(r => r.resourceType === 'CustomerSuccess' || r.resourceType === 'TechnicalSupport')
  const otherResources = resources.filter(r => r.resourceType !== 'CustomerSuccess' && r.resourceType !== 'TechnicalSupport')

  return (
    <div className="space-y-6">
      {supportResources.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Support</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {supportResources.map(r => (
              <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open(r.resourceUrl, '_blank')}>
                <CardContent className="flex items-center gap-4 p-5">
                  {resourceIcon(r.resourceType)}
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-sm text-muted-foreground">{typeLabel(r.resourceType)}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
      {otherResources.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Additional Resources</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherResources.map(r => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {resourceIcon(r.resourceType)}
                    {r.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => window.open(r.resourceUrl, '_blank')}>
                    <ExternalLink className="h-3.5 w-3.5" /> Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
