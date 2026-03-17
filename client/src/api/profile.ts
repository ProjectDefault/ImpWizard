import api from './client'

export interface ProfileDto {
  id: string
  email: string
  fullName: string
  title: string | null
  organization: string | null
  timeZoneId: string | null
  role: string
}

export interface UpdateProfilePayload {
  fullName?: string
  title?: string
  organization?: string
  timeZoneId?: string
}

export interface UpdateEmailPayload {
  newEmail: string
  currentPassword: string
}

export interface UpdatePasswordPayload {
  currentPassword: string
  newPassword: string
}

export async function getProfile(): Promise<ProfileDto> {
  const res = await api.get<ProfileDto>('/profile')
  return res.data
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<void> {
  await api.put('/profile', payload)
}

export async function updateEmail(payload: UpdateEmailPayload): Promise<{ message: string }> {
  const res = await api.put<{ message: string }>('/profile/email', payload)
  return res.data
}

export async function updatePassword(payload: UpdatePasswordPayload): Promise<void> {
  await api.put('/profile/password', payload)
}
