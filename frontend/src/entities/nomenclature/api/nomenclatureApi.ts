import { apiFetch } from '@/shared/api/client'
import type { Nomenclature, CreateNomenclatureDto, UpdateNomenclatureDto } from '../model/types'

export function getNomenclatures(params?: { isActive?: boolean; search?: string }): Promise<Nomenclature[]> {
  const q = new URLSearchParams()
  if (params?.isActive !== undefined) q.set('isActive', String(params.isActive))
  if (params?.search) q.set('search', params.search)
  return apiFetch<Nomenclature[]>('/nomenclatures' + (q.toString() ? '?' + q : ''))
}

export function createNomenclature(dto: CreateNomenclatureDto): Promise<Nomenclature> {
  return apiFetch<Nomenclature>('/nomenclatures', { method: 'POST', body: JSON.stringify(dto) })
}

export function updateNomenclature(id: number, dto: UpdateNomenclatureDto): Promise<Nomenclature> {
  return apiFetch<Nomenclature>('/nomenclatures/' + id, { method: 'PATCH', body: JSON.stringify(dto) })
}

export function deactivateNomenclature(id: number): Promise<Nomenclature> {
  return apiFetch<Nomenclature>('/nomenclatures/' + id + '/deactivate', { method: 'PATCH' })
}
