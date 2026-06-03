import { apiFetch } from '@/shared/api/client'
import type { Driver, CreateDriverDto, UpdateDriverDto } from '../model/types'

export function getDrivers(params?: { isActive?: boolean; search?: string }): Promise<Driver[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<Driver[]>(`/drivers${q.toString() ? `?${q}` : ''}`)
}

export function createDriver(dto: CreateDriverDto): Promise<Driver> {
  return apiFetch<Driver>('/drivers', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateDriver(id: number, dto: UpdateDriverDto): Promise<Driver> {
  return apiFetch<Driver>(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateDriver(id: number): Promise<Driver> {
  return apiFetch<Driver>(`/drivers/${id}/deactivate`, { method: 'PATCH' })
}
