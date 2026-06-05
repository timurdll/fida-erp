import { apiFetch } from '@/shared/api/client'
import type { Application, ApplicationFilters, CreateApplicationDto } from '../model/types'

export const getApplications = (filters: ApplicationFilters = {}): Promise<Application[]> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null) params.set(k, String(v))
  })
  const qs = params.toString()
  return apiFetch('/applications' + (qs ? '?' + qs : ''))
}

export const getApplicationById = (id: number): Promise<Application> =>
  apiFetch('/applications/' + id)

export const createApplication = (dto: CreateApplicationDto): Promise<Application> =>
  apiFetch('/applications', { method: 'POST', body: JSON.stringify(dto) })

export const updateApplication = (
  id: number,
  dto: Partial<CreateApplicationDto>,
): Promise<Application> =>
  apiFetch('/applications/' + id, { method: 'PATCH', body: JSON.stringify(dto) })

export const completeApplication = (id: number): Promise<Application> =>
  apiFetch('/applications/' + id + '/complete', { method: 'PATCH' })

export const deactivateApplication = (id: number): Promise<Application> =>
  apiFetch('/applications/' + id + '/deactivate', { method: 'PATCH' })
