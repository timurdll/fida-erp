export interface Bsu {
  id: number
  name: string
  address?: string | null
  companyId: number
  company?: { id: number; name: string }
  isActive: boolean
}

export interface CreateBsuDto {
  name: string
  companyId: number
  address?: string
}

export type UpdateBsuDto = Partial<CreateBsuDto>
