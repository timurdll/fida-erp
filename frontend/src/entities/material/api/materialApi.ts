import { apiFetch } from '@/shared/api/client'
import type { Material, CreateMaterialDto, UpdateMaterialDto } from '../model/types'

export function getMaterials(params?: { isActive?: boolean; search?: string }): Promise<Material[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<Material[]>(`/materials${q.toString() ? `?${q}` : ''}`)
}

export function createMaterial(dto: CreateMaterialDto): Promise<Material> {
  return apiFetch<Material>('/materials', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateMaterial(id: number, dto: UpdateMaterialDto): Promise<Material> {
  return apiFetch<Material>(`/materials/${id}`, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateMaterial(id: number): Promise<Material> {
  return apiFetch<Material>(`/materials/${id}/deactivate`, { method: 'PATCH' })
}

export function activateMaterial(id: number): Promise<Material> {
  return apiFetch<Material>(`/materials/${id}/activate`, { method: 'PATCH' })
}
