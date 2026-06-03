export interface Transport {
  id: number
  plateNumber: string
  driver?: { id: number; fullName: string }
  carrier?: { id: number; name: string }
  tare?: number
  tolerance: number
  note?: string
  isActive: boolean
}

export interface CreateTransportDto {
  plateNumber: string
  driverId?: number
  carrierId?: number
  tare?: number
  tolerance?: number
  note?: string
}

export type UpdateTransportDto = Partial<CreateTransportDto>
