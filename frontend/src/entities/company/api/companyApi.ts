import { apiFetch } from '@/shared/api/client'
import type { Company, CreateCompanyDto, UpdateCompanyDto } from '../model/types'

export function getCompanies(params?: { isActive?: boolean; search?: string }): Promise<Company[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<Company[]>(`/companies${q.toString() ? `?${q}` : ''}`)
}

export function createCompany(dto: CreateCompanyDto): Promise<Company> {
  return apiFetch<Company>('/companies', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateCompany(id: number, dto: UpdateCompanyDto): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateCompany(id: number): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/deactivate`, { method: 'PATCH' })
}

export function activateCompany(id: number): Promise<Company> {
  return apiFetch<Company>(`/companies/${id}/activate`, { method: 'PATCH' })
}
