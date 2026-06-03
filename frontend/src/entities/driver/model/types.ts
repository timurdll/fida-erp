export interface Driver {
  id: number
  fullName: string
  isActive: boolean
}

export interface CreateDriverDto {
  fullName: string
}

export type UpdateDriverDto = Partial<CreateDriverDto>
