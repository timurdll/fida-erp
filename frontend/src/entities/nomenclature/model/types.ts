export interface Nomenclature {
  id: number
  name: string
  isActive: boolean
}

export interface CreateNomenclatureDto {
  name: string
}

export type UpdateNomenclatureDto = Partial<CreateNomenclatureDto>
