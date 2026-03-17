import apiClient from './client'
import type { AuthUser } from '@/store/authStore'

export interface LoginResponse {
  token: string
  user: AuthUser
}

export async function loginApi(login: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { login, password })
  return data
}
