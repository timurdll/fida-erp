import { apiFetch } from '@/shared/api/client'
import type { Construction, CreateConstructionDto, UpdateConstructionDto } from '../model/types'

export function getConstructions(params?: { isActive?: boolean; search?: string }): Promise<Construction[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<Construction[]>(`/constructions${q.toString() ? `?${q}` : ''}`)
}

export function createConstruction(dto: CreateConstructionDto): Promise<Construction> {
  return apiFetch<Construction>('/constructions', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateConstruction(id: number, dto: UpdateConstructionDto): Promise<Construction> {
  return apiFetch<Construction>(`/constructions/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateConstruction(id: number): Promise<Construction> {
  return apiFetch<Construction>(`/constructions/${id}/deactivate`, { method: 'PATCH' })
}

export function activateConstruction(id: number): Promise<Construction> {
  return apiFetch<Construction>(`/constructions/${id}/activate`, { method: 'PATCH' })
}
