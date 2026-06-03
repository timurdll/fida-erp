import { apiFetch } from './client'
import type { User } from '@/shared/types/user'

export interface LoginResponse {
  accessToken: string
  user: User
}

export function loginApi(login: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login, password }),
  })
}
