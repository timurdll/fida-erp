import { apiFetch } from '@/shared/api/client'
import type { Bsu, CreateBsuDto, UpdateBsuDto } from '../model/types'

export function getBsuList(params?: { isActive?: boolean; search?: string; companyId?: number }): Promise<Bsu[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  if (params?.companyId !== undefined) q.set('companyId', String(params.companyId))
  return apiFetch<Bsu[]>('/bsu' + (q.toString() ? '?' + q : ''))
}

export function createBsu(dto: CreateBsuDto): Promise<Bsu> {
  return apiFetch<Bsu>('/bsu', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateBsu(id: number, dto: UpdateBsuDto): Promise<Bsu> {
  return apiFetch<Bsu>('/bsu/' + id, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateBsu(id: number): Promise<Bsu> {
  return apiFetch<Bsu>('/bsu/' + id + '/deactivate', { method: 'PATCH' })
}
