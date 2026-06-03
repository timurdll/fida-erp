import { apiFetch } from './client'
import type { User, UserRole } from '@/shared/types/user'

export interface CreateUserDto {
  fullName: string
  login: string
  password: string
  role: UserRole
  note?: string
}

export interface UpdateUserDto {
  fullName?: string
  role?: UserRole
  isActive?: boolean
  note?: string
}

export function getUsersApi(isActive?: boolean): Promise<User[]> {
  const query = isActive !== undefined ? `?isActive=${isActive}` : ''
  return apiFetch<User[]>(`/users${query}`)
}

export function createUserApi(dto: CreateUserDto): Promise<User> {
  return apiFetch<User>('/users', {
    method: 'POST',
    body: JSON.stringify(dto),
  })
}

export function updateUserApi(id: number, dto: UpdateUserDto): Promise<User> {
  return apiFetch<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  })
}

export function deactivateUserApi(id: number): Promise<void> {
  return apiFetch<void>(`/users/${id}`, { method: 'DELETE' })
}
