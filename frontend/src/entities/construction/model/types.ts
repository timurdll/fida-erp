export interface Construction {
  id: number
  name: string
  type?: string
  note?: string
  isActive: boolean
}

export interface CreateConstructionDto {
  name: string
  type?: string
  note?: string
}

export type UpdateConstructionDto = Partial<CreateConstructionDto>
