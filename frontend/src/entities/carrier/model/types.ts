export interface Carrier {
  id: number
  name: string
  note?: string
  isActive: boolean
}

export interface CreateCarrierDto {
  name: string
  note?: string
}

export type UpdateCarrierDto = Partial<CreateCarrierDto>
