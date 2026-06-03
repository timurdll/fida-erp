export type MaterialType = 'CONCRETE' | 'SAND' | 'GRAVEL' | 'CEMENT' | 'OTHER'

export const MaterialTypeLabel: Record<MaterialType, string> = {
  CONCRETE: 'Бетон',
  SAND: 'Песок',
  GRAVEL: 'Щебень',
  CEMENT: 'Цемент',
  OTHER: 'Прочее',
}

export interface Material {
  id: number
  name: string
  type: MaterialType
  density?: number
  isActive: boolean
}

export interface CreateMaterialDto {
  name: string
  type: MaterialType
  density?: number
}

export type UpdateMaterialDto = Partial<CreateMaterialDto>
