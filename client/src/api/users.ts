import apiClient from './client'
import type { UserRole } from '@/store/authStore'

export interface UserListDto {
  id: string
  fullName: string
  email: string
  userName: string
  role: UserRole
  company: string | null
  lastLogin: string | null
}

export interface InvitePayload {
  email: string
  fullName: string
  role: UserRole
  projectId?: number
}

export interface InviteResponse {
  id: string
  email: string
  fullName: string
  role: UserRole
  temporaryPassword: string
}

export interface UserDetailDto {
  id: string
  fullName: string
  email: string
  userName: string
  title: string | null
  organization: string | null
  timeZoneId: string | null
  role: UserRole
}

export interface UserProjectDto {
  id: number
  customerName: string
  status: string
  userRole: string
}

export interface UpdateUserPayload {
  fullName: string
  title?: string
  organization?: string
  timeZoneId?: string
  role?: UserRole
}

export async function getUsers(role?: string): Promise<UserListDto[]> {
  const { data } = await apiClient.get<UserListDto[]>('/users', { params: role ? { role } : undefined })
  return data
}

export async function getUser(id: string): Promise<UserDetailDto> {
  const { data } = await apiClient.get<UserDetailDto>(`/users/${id}`)
  return data
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<void> {
  await apiClient.put(`/users/${id}`, payload)
}

export async function resetUserPassword(id: string): Promise<string> {
  const { data } = await apiClient.post<{ temporaryPassword: string }>(`/users/${id}/reset-password`)
  return data.temporaryPassword
}

export async function getUserProjects(id: string): Promise<UserProjectDto[]> {
  const { data } = await apiClient.get<UserProjectDto[]>(`/users/${id}/projects`)
  return data
}

export async function inviteUser(payload: InvitePayload): Promise<InviteResponse> {
  const { data } = await apiClient.post<InviteResponse>('/users/invite', payload)
  return data
}
