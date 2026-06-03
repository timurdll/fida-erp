export interface ObjectItem {
  id: number
  name: string
  companyId: number
  company: { id: number; name: string }
  address?: string
  receiverPhone?: string
  isActive: boolean
}

export interface CreateObjectDto {
  name: string
  companyId: number
  address?: string
  receiverPhone?: string
}

export type UpdateObjectDto = Partial<CreateObjectDto>
