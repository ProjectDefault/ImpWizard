import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Search, Plus, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getProjects, createProject } from '@/api/projects'
import type { CreateProjectPayload } from '@/api/projects'
import { getUsers } from '@/api/users'
import { getImplementationTypes } from '@/api/implementationTypes'
import { useAuthStore } from '@/store/authStore'
import ProgramSelect from '@/components/shared/ProgramSelect'

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Complete: 'default',
  Active: 'secondary',
  OnHold: 'outline',
}

const EMPTY_FORM: CreateProjectPayload = {
  projectType: '',
  customerName: '',
  salesforceAccountId: '',
  salesforceProjectId: '',
  assignedSpecialistId: '',
}

export default function ProjectsPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'Admin'

  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [form, setForm] = useState<CreateProjectPayload>(EMPTY_FORM)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects,
  })

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
    enabled: sheetOpen,
  })

  const { data: implementationTypes = [] } = useQuery({
    queryKey: ['implementation-types'],
    queryFn: getImplementationTypes,
    select: (data) => data.filter(t => t.isActive),
  })
  const specialists = allUsers.filter(u => u.role === 'Admin' || u.role === 'CIS')

  const { mutate: submitCreate, isPending } = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project created.')
      setSheetOpen(false)
      setForm(EMPTY_FORM)
    },
    onError: () => toast.error('Failed to create project.'),
  })

  const filtered = projects.filter(p =>
    p.customerName.toLowerCase().includes(search.toLowerCase())
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.customerName.trim()) return
    submitCreate({
      ...form,
      salesforceAccountId: form.salesforceAccountId || undefined,
      salesforceProjectId: form.salesforceProjectId || undefined,
      assignedSpecialistId: form.assignedSpecialistId || undefined,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">All customer implementation projects</p>
        </div>
        <Button
          size="sm"
          disabled={implementationTypes.length === 0}
          title={implementationTypes.length === 0 ? 'No active implementation types — add one in Admin Settings before creating a project.' : undefined}
          onClick={() => {
            setForm({ ...EMPTY_FORM, projectType: implementationTypes[0]?.name ?? '' })
            setSheetOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Button>
      </div>

      {implementationTypes.length === 0 && (
        <div className="flex items-center gap-2 rounded-md border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            No active Implementation Types exist. Go to{' '}
            <a href="/admin/settings/implementation-types" className="font-medium underline underline-offset-2">
              Admin Settings → Implementation Types
            </a>{' '}
            to add one before creating projects.
          </span>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Current Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assigned CIS</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  {search ? 'No projects match your search.' : 'No projects yet. Create one to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{p.customerName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{p.projectType}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">Step {p.currentStep} / 7</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[p.status] ?? 'outline'}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.assignedSpecialist?.name ?? 'Unassigned'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/projects/${p.id}`)}>Open</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Project</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Project Type</Label>
              <Select
                value={form.projectType}
                onValueChange={v => setForm(f => ({ ...f, projectType: v }))}
                disabled={!isAdmin}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {implementationTypes.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No active implementation types</div>
                  ) : (
                    implementationTypes.map(t => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">Project type is Admin-only.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customerName"
                placeholder="Acme Brewing Co."
                value={form.customerName}
                onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfAccountId">Salesforce Account ID</Label>
              <Input
                id="sfAccountId"
                placeholder="0015g00000XXXXXX"
                value={form.salesforceAccountId ?? ''}
                onChange={e => setForm(f => ({ ...f, salesforceAccountId: e.target.value }))}
                disabled={!isAdmin}
              />
              {!isAdmin && (
                <p className="text-xs text-muted-foreground">Salesforce fields are Admin-only.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sfProjectId">Salesforce Implementation Project</Label>
              <Input
                id="sfProjectId"
                placeholder="a0B5g00000XXXXXX"
                value={form.salesforceProjectId ?? ''}
                onChange={e => setForm(f => ({ ...f, salesforceProjectId: e.target.value }))}
                disabled={!isAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign Specialist</Label>
              <Select
                value={form.assignedSpecialistId ?? ''}
                onValueChange={v => setForm(f => ({ ...f, assignedSpecialistId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a specialist..." />
                </SelectTrigger>
                <SelectContent>
                  {specialists.length === 0 ? (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground">No Admin or CIS users yet</div>
                  ) : (
                    specialists.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.fullName} ({s.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <ProgramSelect
              value={form.programId ?? null}
              onChange={pid => setForm(f => ({ ...f, programId: pid ?? undefined }))}
            />

            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !form.customerName.trim()}>
                {isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
