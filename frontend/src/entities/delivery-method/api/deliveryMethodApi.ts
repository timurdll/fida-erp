import { apiFetch } from '@/shared/api/client'
import type { DeliveryMethod, CreateDeliveryMethodDto, UpdateDeliveryMethodDto } from '../model/types'

export function getDeliveryMethods(params?: { isActive?: boolean; search?: string }): Promise<DeliveryMethod[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<DeliveryMethod[]>(`/delivery-methods${q.toString() ? `?${q}` : ''}`)
}

export function createDeliveryMethod(dto: CreateDeliveryMethodDto): Promise<DeliveryMethod> {
  return apiFetch<DeliveryMethod>('/delivery-methods', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateDeliveryMethod(id: number, dto: UpdateDeliveryMethodDto): Promise<DeliveryMethod> {
  return apiFetch<DeliveryMethod>(`/delivery-methods/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateDeliveryMethod(id: number): Promise<DeliveryMethod> {
  return apiFetch<DeliveryMethod>(`/delivery-methods/${id}/deactivate`, { method: 'PATCH' })
}
