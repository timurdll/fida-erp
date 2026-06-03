import { apiFetch } from '@/shared/api/client'
import type { Carrier, CreateCarrierDto, UpdateCarrierDto } from '../model/types'

export function getCarriers(params?: { isActive?: boolean; search?: string }): Promise<Carrier[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<Carrier[]>(`/carriers${q.toString() ? `?${q}` : ''}`)
}

export function createCarrier(dto: CreateCarrierDto): Promise<Carrier> {
  return apiFetch<Carrier>('/carriers', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateCarrier(id: number, dto: UpdateCarrierDto): Promise<Carrier> {
  return apiFetch<Carrier>(`/carriers/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateCarrier(id: number): Promise<Carrier> {
  return apiFetch<Carrier>(`/carriers/${id}/deactivate`, { method: 'PATCH' })
}

export function activateCarrier(id: number): Promise<Carrier> {
  return apiFetch<Carrier>(`/carriers/${id}/activate`, { method: 'PATCH' })
}
