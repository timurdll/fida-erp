import { apiFetch } from '@/shared/api/client'
import type { PlumbLog, CreatePlumbLogDto, PlumbLogFilters } from '../model/types'

export function getPlumbLogs(filters: PlumbLogFilters = {}): Promise<PlumbLog[]> {
  const q = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null) q.set(k, String(v))
  })
  return apiFetch<PlumbLog[]>('/plumb-logs' + (q.toString() ? '?' + q : ''))
}

export function getPlumbLogById(id: number): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs/' + id)
}

export function createPlumbLog(dto: CreatePlumbLogDto): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs', { method: 'POST', body: JSON.stringify(dto) })
}

export function updatePlumbLog(id: number, dto: Partial<CreatePlumbLogDto>): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs/' + id, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function weighTare(id: number, weight: number): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs/' + id + '/weigh-tare', {
    method: 'PATCH',
    body: JSON.stringify({ weight }),
  })
}

export function weighGross(id: number, weight: number): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs/' + id + '/weigh-gross', {
    method: 'PATCH',
    body: JSON.stringify({ weight }),
  })
}

export function createReturn(id: number): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs/' + id + '/return', { method: 'POST' })
}

export function deactivatePlumbLog(id: number): Promise<PlumbLog> {
  return apiFetch<PlumbLog>('/plumb-logs/' + id + '/deactivate', { method: 'PATCH' })
}
