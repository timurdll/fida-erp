export interface Bsu {
  id: number
  name: string
  address?: string | null
  companies: { id: number; name: string }[]
  isActive: boolean
}

export interface CreateBsuDto {
  name: string
  companyIds?: number[]
  address?: string
}

export type UpdateBsuDto = Partial<CreateBsuDto>
