import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Search, Plus, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { getUsers, getUser, updateUser, resetUserPassword, getUserProjects, inviteUser } from '@/api/users'
import type { InvitePayload, InviteResponse, UserListDto, UpdateUserPayload } from '@/api/users'
import type { UserRole } from '@/store/authStore'
import { useAuthStore } from '@/store/authStore'

// ── Timezone combobox (same pattern as ProfilePage) ──────────────────────────

const NOW = new Date()
interface TzOption { id: string; abbr: string; label: string }

const TIMEZONE_OPTIONS: TzOption[] = (() => {
  const ids: string[] = typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
    ? (Intl as unknown as { supportedValuesOf: (key: string) => string[] }).supportedValuesOf('timeZone')
    : ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']
  return ids.map(id => {
    let abbr = ''
    try {
      const parts = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'short' }).formatToParts(NOW)
      abbr = parts.find(p => p.type === 'timeZoneName')?.value ?? ''
    } catch { /* skip */ }
    return { id, abbr, label: abbr ? `${id} (${abbr})` : id }
  })
})()

function TimezoneCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = TIMEZONE_OPTIONS.find(t => t.id === value)
  const inputValue = open ? query : (selected?.label ?? '')

  const filtered = useMemo(() => {
    if (!query.trim()) return TIMEZONE_OPTIONS.slice(0, 100)
    const q = query.toLowerCase()
    return TIMEZONE_OPTIONS.filter(t =>
      t.id.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q)
    ).slice(0, 100)
  }, [query])

  const openDropdown = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, zIndex: 9999 })
    }
    setOpen(true)
    setQuery('')
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={containerRef}>
      <Input ref={inputRef} value={inputValue} placeholder="Search timezone..."
        onFocus={openDropdown} onChange={e => { setQuery(e.target.value); setOpen(true) }} autoComplete="off" />
      {open && (
        <div style={dropdownStyle} className="rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-y-auto py-1">
            <div className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-muted-foreground italic"
              onMouseDown={() => { onChange(''); setQuery(''); setOpen(false) }}>None (UTC)</div>
            {filtered.length === 0
              ? <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
              : filtered.map(tz => (
                <div key={tz.id}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between ${tz.id === value ? 'bg-accent/50 font-medium' : ''}`}
                  onMouseDown={() => { onChange(tz.id); setQuery(''); setOpen(false) }}>
                  <span>{tz.id}</span>
                  {tz.abbr && <span className="text-xs text-muted-foreground ml-2 shrink-0">{tz.abbr}</span>}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Status badge helper ───────────────────────────────────────────────────────

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Active: 'default',
  Complete: 'secondary',
  OnHold: 'outline',
}

// ── Main page ─────────────────────────────────────────────────────────────────

const roleVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  Admin: 'default',
  CIS: 'secondary',
  SuperCustomer: 'outline',
  Customer: 'outline',
}

const EMPTY_INVITE: InvitePayload = { email: '', fullName: '', role: 'Customer' }
const ALL_ROLES: UserRole[] = ['Admin', 'CIS', 'SuperCustomer', 'Customer']

export default function UsersPage() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const isAdmin = me?.role === 'Admin'

  // ── Invite state ──────────────────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<InvitePayload>(EMPTY_INVITE)
  const [result, setResult] = useState<InviteResponse | null>(null)
  const [copied, setCopied] = useState(false)

  // ── Edit sheet state ──────────────────────────────────────────────────────
  const [editUser, setEditUser] = useState<UserListDto | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editForm, setEditForm] = useState<UpdateUserPayload>({ fullName: '', title: '', organization: '', timeZoneId: '', role: 'Customer' })
  const [resetResult, setResetResult] = useState<string | null>(null)
  const [resetCopied, setResetCopied] = useState(false)

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const { data: userDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['user-detail', editUser?.id],
    queryFn: () => getUser(editUser!.id),
    enabled: !!editUser,
  })

  const { data: userProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['user-projects', editUser?.id],
    queryFn: () => getUserProjects(editUser!.id),
    enabled: !!editUser,
  })

  // Populate edit form when detail loads
  useEffect(() => {
    if (userDetail) {
      setEditForm({
        fullName: userDetail.fullName,
        title: userDetail.title ?? '',
        organization: userDetail.organization ?? '',
        timeZoneId: userDetail.timeZoneId ?? '',
        role: userDetail.role,
      })
    }
  }, [userDetail])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const { mutate: submitInvite, isPending: invitePending } = useMutation({
    mutationFn: inviteUser,
    onSuccess: (data) => { qc.invalidateQueries({ queryKey: ['users'] }); setResult(data) },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? 'Failed to invite user.')
    },
  })

  const { mutate: saveUser, isPending: savePending } = useMutation({
    mutationFn: () => updateUser(editUser!.id, {
      fullName: editForm.fullName.trim(),
      title: editForm.title?.trim() || undefined,
      organization: editForm.organization?.trim() || undefined,
      timeZoneId: editForm.timeZoneId || undefined,
      role: editForm.role,
    }),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user-detail', editUser?.id] })
    },
    onError: () => toast.error('Failed to update user'),
  })

  const { mutate: doResetPassword, isPending: resetPending } = useMutation({
    mutationFn: () => resetUserPassword(editUser!.id),
    onSuccess: (pw) => { setResetResult(pw); setResetCopied(false) },
    onError: () => toast.error('Failed to reset password'),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const filtered = users.filter(u =>
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  const allowedRoles: UserRole[] = isAdmin ? ['Admin', 'CIS', 'SuperCustomer', 'Customer'] : ['Customer', 'SuperCustomer']

  function handleOpenEdit(u: UserListDto) {
    setEditUser(u)
    setResetResult(null)
    setResetCopied(false)
    setSheetOpen(true)
  }

  function handleOpenDialog() {
    setForm(EMPTY_INVITE); setResult(null); setCopied(false); setDialogOpen(true)
  }

  function copyPassword() {
    if (result?.temporaryPassword) {
      navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  function copyResetPassword() {
    if (resetResult) {
      navigator.clipboard.writeText(resetResult)
      setResetCopied(true); setTimeout(() => setResetCopied(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage user accounts and roles</p>
        </div>
        <Button size="sm" onClick={handleOpenDialog}>
          <Plus className="h-4 w-4 mr-1" />
          Invite User
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search users..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Username</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  {search ? 'No users match your search.' : 'No users found.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant[u.role] ?? 'outline'}>{u.role}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{u.userName}</TableCell>
                  <TableCell>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(u)}>Edit</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={open => { if (!open) setSheetOpen(false) }}>
        <SheetContent className="w-[440px] sm:w-[540px] overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>{editUser?.fullName}</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="profile">
            <TabsList className="mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
            </TabsList>

            {/* Profile tab */}
            <TabsContent value="profile" className="space-y-4">
              {detailLoading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input value={userDetail?.email ?? ''} readOnly className="bg-muted text-muted-foreground" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input value={editForm.title ?? ''} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Implementation Manager" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Organization</Label>
                    <Input value={editForm.organization ?? ''} onChange={e => setEditForm(f => ({ ...f, organization: e.target.value }))} placeholder="e.g. Acme Corp" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Timezone</Label>
                    <TimezoneCombobox value={editForm.timeZoneId ?? ''} onChange={v => setEditForm(f => ({ ...f, timeZoneId: v }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as UserRole }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button size="sm" onClick={() => saveUser()} disabled={savePending || !editForm.fullName.trim()}>
                    {savePending ? 'Saving...' : 'Save Changes'}
                  </Button>

                  <Separator className="my-2" />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Reset Password</p>
                    <p className="text-xs text-muted-foreground">Generates a new temporary password for this user.</p>
                    {resetResult ? (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input value={resetResult} readOnly className="font-mono text-sm" />
                          <Button type="button" variant="outline" size="sm" onClick={copyResetPassword}>
                            {resetCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Share this password securely — it cannot be recovered.</p>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => doResetPassword()} disabled={resetPending}>
                        {resetPending ? 'Resetting...' : 'Reset Password'}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </TabsContent>

            {/* Projects tab */}
            <TabsContent value="projects">
              {projectsLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : userProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Not associated with any projects.</p>
              ) : (
                <div className="space-y-2">
                  {userProjects.map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border px-3 py-2.5">
                      <div>
                        <p className="text-sm font-medium">{p.customerName}</p>
                        <p className="text-xs text-muted-foreground">{p.userRole}</p>
                      </div>
                      <Badge variant={statusVariant[p.status] ?? 'outline'} className="text-xs">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* ── Invite Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={open => { if (!open) { setDialogOpen(false); setResult(null) } }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{result ? 'User Invited' : 'Invite User'}</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Account created for <strong>{result.fullName}</strong> ({result.role}).
                Share these credentials securely — the password cannot be recovered later.
              </p>
              <div className="space-y-2">
                <Label>Email / Username</Label>
                <Input value={result.email} readOnly />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <div className="flex gap-2">
                  <Input value={result.temporaryPassword} readOnly className="font-mono" />
                  <Button type="button" variant="outline" size="sm" onClick={copyPassword}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setDialogOpen(false); setResult(null) }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); submitInvite(form) }} className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Email <span className="text-destructive">*</span></Label>
                <Input id="inviteEmail" type="email" placeholder="jane@brewery.com"
                  value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteName">Full Name <span className="text-destructive">*</span></Label>
                <Input id="inviteName" placeholder="Jane Smith"
                  value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allowedRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!isAdmin && (
                  <p className="text-xs text-muted-foreground">CIS can only invite Customer and SuperCustomer users.</p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={invitePending || !form.email || !form.fullName}>
                  {invitePending ? 'Sending...' : 'Create Account'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
