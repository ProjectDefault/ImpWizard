import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, UserPlus, Trash2, ChevronDown, Mail, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { getPortalTeam, getPortalForms, inviteToProject, removeFromProject, assignFormToUser } from '@/api/portal'
import { getUsers, inviteUser } from '@/api/users'
import { useAuthStore } from '@/store/authStore'

interface Props {
  projectId: number
}

export default function PortalTeamTab({ projectId }: Props) {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdminOrCis = currentUser?.role === 'Admin' || currentUser?.role === 'CIS'

  const [addSheet, setAddSheet] = useState(false)
  const [inviteSheet, setInviteSheet] = useState(false)

  // Add existing user form state
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'Customer' | 'SuperCustomer'>('Customer')

  // New user invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFullName, setInviteFullName] = useState('')
  const [inviteRole, setInviteRole] = useState<'Customer' | 'SuperCustomer'>('Customer')
  const [newUserCreds, setNewUserCreds] = useState<{ email: string; password: string } | null>(null)

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['portal-team', projectId],
    queryFn: () => getPortalTeam(projectId),
  })

  const { data: forms } = useQuery({
    queryKey: ['portal-forms', projectId],
    queryFn: () => getPortalForms(projectId),
  })

  // Load Customer + SuperCustomer users for the "add existing" flow
  const { data: allUsers } = useQuery({
    queryKey: ['users-customer-supercustomer'],
    queryFn: async () => {
      const [customers, superCustomers] = await Promise.all([
        getUsers('Customer'),
        getUsers('SuperCustomer'),
      ])
      return [...customers, ...superCustomers]
    },
    enabled: addSheet,
  })

  const addMutation = useMutation({
    mutationFn: () => inviteToProject(projectId, selectedUserId, selectedRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-team', projectId] })
      setAddSheet(false)
      setSelectedUserId('')
      setSelectedRole('Customer')
      toast.success('Team member added.')
    },
    onError: () => toast.error('Failed to add team member.'),
  })

  const createAndAddMutation = useMutation({
    mutationFn: async () => {
      const created = await inviteUser({ email: inviteEmail, fullName: inviteFullName, role: inviteRole })
      await inviteToProject(projectId, created.id, inviteRole)
      return created
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['portal-team', projectId] })
      setNewUserCreds({ email: created.email, password: created.temporaryPassword })
      setInviteEmail('')
      setInviteFullName('')
      setInviteRole('Customer')
    },
    onError: () => toast.error('Failed to invite user.'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeFromProject(projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-team', projectId] })
      toast.success('Team member removed.')
    },
    onError: () => toast.error('Failed to remove team member.'),
  })

  const assignFormMutation = useMutation({
    mutationFn: ({ formId, userId }: { formId: number; userId: string | null }) =>
      assignFormToUser(projectId, formId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-forms', projectId] })
      toast.success('Form assignment updated.')
    },
    onError: () => toast.error('Failed to update assignment.'),
  })

  const teamMembers = team ?? []
  const unassignedUsers = allUsers?.filter(u => !teamMembers.some(m => m.userId === u.id)) ?? []

  function getRoleBadgeVariant(role: string) {
    return role === 'SuperCustomer' ? 'default' : 'outline'
  }

  return (
    <div className="space-y-6">
      {/* Team members section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm">Team Members</h3>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setInviteSheet(true)}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Invite New
            </Button>
            <Button size="sm" onClick={() => setAddSheet(true)}>
              <UserPlus className="h-3.5 w-3.5 mr-1.5" />
              Add Existing
            </Button>
          </div>
        </div>

        {teamLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : teamMembers.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground border rounded-lg">
            No team members yet. Add an existing user or invite someone new.
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {teamMembers.map(member => (
              <div key={member.accessId} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  <Badge variant={getRoleBadgeVariant(member.role)} className="text-xs">
                    {member.role}
                  </Badge>
                  {/* Only Admin/CIS can remove; SuperCustomer can remove Customer only */}
                  {(isAdminOrCis || (currentUser?.role === 'SuperCustomer' && member.role === 'Customer')) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeMutation.mutate(member.userId)}
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form assignments section */}
      {forms && forms.length > 0 && (
        <>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-medium text-sm">Form Assignments</h3>
              <span className="text-xs text-muted-foreground">(assign who is responsible for each submission)</span>
            </div>
            <div className="divide-y rounded-lg border">
              {forms.map(form => (
                <div key={form.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{form.formName}</p>
                    <Badge variant="outline" className="text-xs mt-0.5">
                      {form.status}
                    </Badge>
                  </div>
                  <div className="ml-4 shrink-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs">
                          {form.assignedToName ?? 'Unassigned'}
                          <ChevronDown className="ml-1.5 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => assignFormMutation.mutate({ formId: form.id, userId: null })}
                        >
                          Unassigned
                        </DropdownMenuItem>
                        {teamMembers.map(member => (
                          <DropdownMenuItem
                            key={member.userId}
                            onClick={() => assignFormMutation.mutate({ formId: form.id, userId: member.userId })}
                          >
                            {member.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add existing user sheet */}
      <Sheet open={addSheet} onOpenChange={setAddSheet}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Add Team Member</SheetTitle>
            <SheetDescription>Add an existing Customer or SuperCustomer user to this project.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} — {u.email} ({u.role})
                    </SelectItem>
                  ))}
                  {unassignedUsers.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No available users.</div>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Project Role</Label>
              <Select value={selectedRole} onValueChange={v => setSelectedRole(v as 'Customer' | 'SuperCustomer')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Customer">Customer</SelectItem>
                  <SelectItem value="SuperCustomer">SuperCustomer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              disabled={!selectedUserId || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              Add to Project
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite new user sheet */}
      <Sheet open={inviteSheet} onOpenChange={open => { setInviteSheet(open); if (!open) setNewUserCreds(null) }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Invite New User</SheetTitle>
            <SheetDescription>Create a new account and add the user to this project.</SheetDescription>
          </SheetHeader>

          {newUserCreds ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 space-y-2 dark:bg-green-950 dark:border-green-800">
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">User created successfully!</p>
                <p className="text-xs text-green-700 dark:text-green-300">Share these credentials with the new user.</p>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-sm font-mono">{newUserCreds.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-sm font-mono">{newUserCreds.password}</span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setInviteSheet(false); setNewUserCreds(null) }}>
                Done
              </Button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input
                  placeholder="Jane Smith"
                  value={inviteFullName}
                  onChange={e => setInviteFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="jane@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={v => setInviteRole(v as 'Customer' | 'SuperCustomer')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="SuperCustomer">SuperCustomer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full"
                disabled={!inviteEmail || !inviteFullName || createAndAddMutation.isPending}
                onClick={() => createAndAddMutation.mutate()}
              >
                Create &amp; Add to Project
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
