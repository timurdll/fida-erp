export interface DeliveryMethod {
  id: number
  name: string
  type?: string
  note?: string
  isActive: boolean
}

export interface CreateDeliveryMethodDto {
  name: string
  type?: string
  note?: string
}

export type UpdateDeliveryMethodDto = Partial<CreateDeliveryMethodDto>
