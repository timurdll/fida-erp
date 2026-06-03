import { apiFetch } from '@/shared/api/client'
import type { Transport, CreateTransportDto, UpdateTransportDto } from '../model/types'

export function getTransports(params?: { isActive?: boolean; search?: string; carrierId?: number; driverId?: number }): Promise<Transport[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  if (params?.carrierId) q.set('carrierId', String(params.carrierId))
  if (params?.driverId) q.set('driverId', String(params.driverId))
  return apiFetch<Transport[]>(`/transports${q.toString() ? `?${q}` : ''}`)
}

export function createTransport(dto: CreateTransportDto): Promise<Transport> {
  return apiFetch<Transport>('/transports', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateTransport(id: number, dto: UpdateTransportDto): Promise<Transport> {
  return apiFetch<Transport>(`/transports/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateTransport(id: number): Promise<Transport> {
  return apiFetch<Transport>(`/transports/${id}/deactivate`, { method: 'PATCH' })
}
