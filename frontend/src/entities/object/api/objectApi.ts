import { apiFetch } from '@/shared/api/client'
import type { ObjectItem, CreateObjectDto, UpdateObjectDto } from '../model/types'

export function getObjects(params?: { isActive?: boolean; search?: string; companyId?: number }): Promise<ObjectItem[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  if (params?.companyId) q.set('companyId', String(params.companyId))
  return apiFetch<ObjectItem[]>(`/objects${q.toString() ? `?${q}` : ''}`)
}

export function createObject(dto: CreateObjectDto): Promise<ObjectItem> {
  return apiFetch<ObjectItem>('/objects', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateObject(id: number, dto: UpdateObjectDto): Promise<ObjectItem> {
  return apiFetch<ObjectItem>(`/objects/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateObject(id: number): Promise<ObjectItem> {
  return apiFetch<ObjectItem>(`/objects/${id}/deactivate`, { method: 'PATCH' })
}

export function activateObject(id: number): Promise<ObjectItem> {
  return apiFetch<ObjectItem>(`/objects/${id}/activate`, { method: 'PATCH' })
}
