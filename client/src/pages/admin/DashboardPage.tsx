import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderKanban, CheckCircle, Clock, Users } from 'lucide-react'

const stageData = [
  { stage: 'Step 1 — Business Profile',  count: 3 },
  { stage: 'Step 2 — Preferences',       count: 1 },
  { stage: 'Step 3 — Catalog Search',    count: 4 },
  { stage: 'Step 4 — Flexible Import',   count: 2 },
  { stage: 'Step 5 — Staging Review',    count: 5 },
  { stage: 'Step 6 — Validation',        count: 2 },
  { stage: 'Step 7 — Export',            count: 1 },
]
const stageMax = Math.max(...stageData.map(s => s.count))

const stats = [
  { label: 'Active Projects', value: '—', icon: FolderKanban, description: 'In progress' },
  { label: 'Completed', value: '—', icon: CheckCircle, description: 'This month' },
  { label: 'Pending Export', value: '—', icon: Clock, description: 'Awaiting Step 7' },
  { label: 'Total Customers', value: '—', icon: Users, description: 'All time' },
]

const recentActivity = [
  { project: 'Acme Brewing Co.', action: 'Completed Step 3 — Catalog Search', time: '2 min ago', status: 'active' },
  { project: 'Sunset Winery', action: 'Export generated (v2)', time: '1 hr ago', status: 'complete' },
  { project: 'Blue Ridge Cidery', action: 'Started onboarding', time: '3 hr ago', status: 'active' },
  { project: 'High Peaks Distillery', action: 'Validation passed', time: 'Yesterday', status: 'active' },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of all implementation projects</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects by Stage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projects by Stage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {stageData.map(s => (
            <div key={s.stage} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-44 shrink-0 truncate">{s.stage}</span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(s.count / stageMax) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium w-4 text-right shrink-0">{s.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start justify-between px-6 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.project}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.action}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={item.status === 'complete' ? 'default' : 'secondary'} className="text-xs">
                    {item.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
