import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { getProfile, updateProfile, updateEmail, updatePassword } from '@/api/profile'
import type { ProfileDto } from '@/api/profile'

// Build timezone list with abbreviations once at module load
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

// Filterable timezone combobox
function TimezoneCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const selected = TIMEZONE_OPTIONS.find(t => t.id === value)

  // Display the selected label in the input when not searching
  const inputValue = open ? query : (selected?.label ?? '')

  const filtered = useMemo(() => {
    if (!query.trim()) return TIMEZONE_OPTIONS.slice(0, 100) // show first 100 when empty
    const q = query.toLowerCase()
    return TIMEZONE_OPTIONS.filter(t =>
      t.id.toLowerCase().includes(q) || t.abbr.toLowerCase().includes(q)
    ).slice(0, 100)
  }, [query])

  // Position dropdown using fixed so it escapes overflow:hidden parents
  const openDropdown = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      })
    }
    setOpen(true)
    setQuery('')
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (tz: TzOption) => {
    onChange(tz.id)
    setQuery('')
    setOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setQuery('')
    setOpen(false)
  }

  return (
    <div ref={containerRef}>
      <Input
        ref={inputRef}
        value={inputValue}
        placeholder="Search timezone..."
        onFocus={openDropdown}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        autoComplete="off"
      />
      {open && (
        <div style={dropdownStyle} className="rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-y-auto py-1">
            <div
              className="px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-muted-foreground italic"
              onMouseDown={() => handleClear()}
            >
              None (UTC)
            </div>
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
            ) : (
              filtered.map(tz => (
                <div
                  key={tz.id}
                  className={`px-3 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between ${tz.id === value ? 'bg-accent/50 font-medium' : ''}`}
                  onMouseDown={() => handleSelect(tz)}
                >
                  <span>{tz.id}</span>
                  {tz.abbr && <span className="text-xs text-muted-foreground ml-2 shrink-0">{tz.abbr}</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const logout = useAuthStore(s => s.logout)

  const { data: profile, refetch } = useQuery<ProfileDto>({
    queryKey: ['profile'],
    queryFn: getProfile,
  })

  // Basic info form
  const [basicForm, setBasicForm] = useState({ fullName: '', title: '', organization: '', timeZoneId: '' })
  const [basicEditing, setBasicEditing] = useState(false)

  const basicMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success('Profile updated')
      setBasicEditing(false)
      refetch()
    },
    onError: () => toast.error('Failed to update profile'),
  })

  // Email form
  const [emailForm, setEmailForm] = useState({ newEmail: '', currentPassword: '' })

  const emailMutation = useMutation({
    mutationFn: updateEmail,
    onSuccess: (res) => {
      toast.success(res.message)
      setTimeout(() => {
        logout()
        window.location.href = '/login'
      }, 1500)
    },
    onError: () => toast.error('Failed to update email — check your current password'),
  })

  // Password form
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })

  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success('Password changed')
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    },
    onError: () => toast.error('Failed to change password — check your current password'),
  })

  const handleBasicEdit = () => {
    if (profile) {
      setBasicForm({
        fullName: profile.fullName,
        title: profile.title ?? '',
        organization: profile.organization ?? '',
        timeZoneId: profile.timeZoneId ?? '',
      })
      setBasicEditing(true)
    }
  }

  const handleBasicSave = () => {
    if (!basicForm.fullName.trim()) { toast.error('Name is required'); return }
    basicMutation.mutate({
      fullName: basicForm.fullName.trim(),
      title: basicForm.title.trim() || undefined,
      organization: basicForm.organization.trim() || undefined,
      timeZoneId: basicForm.timeZoneId || undefined,
    })
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailForm.newEmail.trim() || !emailForm.currentPassword) {
      toast.error('All fields are required')
      return
    }
    emailMutation.mutate({ newEmail: emailForm.newEmail.trim(), currentPassword: emailForm.currentPassword })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (pwForm.newPassword !== pwForm.confirmPassword) { toast.error('Passwords do not match'); return }
    if (pwForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    passwordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  if (!profile) return <div className="p-6 text-sm text-muted-foreground">Loading profile...</div>

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">{profile.role}</p>
      </div>

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Basic Information</CardTitle>
            {!basicEditing && (
              <Button size="sm" variant="outline" onClick={handleBasicEdit}>Edit</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {basicEditing ? (
            <>
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={basicForm.fullName} onChange={e => setBasicForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={basicForm.title} onChange={e => setBasicForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Implementation Manager" />
              </div>
              <div className="space-y-1.5">
                <Label>Organization</Label>
                <Input value={basicForm.organization} onChange={e => setBasicForm(f => ({ ...f, organization: e.target.value }))} placeholder="e.g. Acme Corp" />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <TimezoneCombobox
                  value={basicForm.timeZoneId}
                  onChange={v => setBasicForm(f => ({ ...f, timeZoneId: v }))}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleBasicSave} disabled={basicMutation.isPending}>
                  {basicMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setBasicEditing(false)}>Cancel</Button>
              </div>
            </>
          ) : (
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {profile.fullName}</div>
              <div><span className="font-medium">Email:</span> {profile.email}</div>
              {profile.title && <div><span className="font-medium">Title:</span> {profile.title}</div>}
              {profile.organization && <div><span className="font-medium">Organization:</span> {profile.organization}</div>}
              <div>
                <span className="font-medium">Timezone:</span>{' '}
                {profile.timeZoneId
                  ? TIMEZONE_OPTIONS.find(t => t.id === profile.timeZoneId)?.label ?? profile.timeZoneId
                  : 'UTC'}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Change */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Change Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Email *</Label>
              <Input
                type="email"
                value={emailForm.newEmail}
                onChange={e => setEmailForm(f => ({ ...f, newEmail: e.target.value }))}
                placeholder="new@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Current Password *</Label>
              <Input
                type="password"
                value={emailForm.currentPassword}
                onChange={e => setEmailForm(f => ({ ...f, currentPassword: e.target.value }))}
              />
            </div>
            <p className="text-xs text-muted-foreground">You will be logged out after changing your email.</p>
            <Button type="submit" size="sm" disabled={emailMutation.isPending}>
              {emailMutation.isPending ? 'Updating...' : 'Update Email'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current Password *</Label>
              <Input type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>New Password *</Label>
              <Input type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password *</Label>
              <Input type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={passwordMutation.isPending}>
              {passwordMutation.isPending ? 'Changing...' : 'Change Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
