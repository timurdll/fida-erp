export interface PlumbLog {
  id: number
  applicationId: number | null
  supplierId: number
  supplier: { id: number; name: string }
  customerId: number
  customer: { id: number; name: string }
  materialId: number
  material: { id: number; name: string; type: string }
  objectId: number | null
  object?: { id: number; name: string } | null
  transportId: number | null
  transport?: { id: number; plateNumber: string; tare: number | null } | null
  driverId: number | null
  driver?: { id: number; fullName: string } | null
  carrierId: number | null
  carrier?: { id: number; name: string } | null
  constructionId: number | null
  construction?: { id: number; name: string } | null
  bsuId: number | null
  bsu?: { id: number; name: string } | null
  nomenclatureId: number | null
  nomenclature?: { id: number; name: string } | null

  tare: number | null
  gross: number | null
  net: number | null

  volume: number | null
  returnVolume: number | null
  sealNumber: string | null
  slumpCone: number | null
  deliveryType: string | null

  impurity: number | null
  cleanNet: number | null
  documentWeight: number | null

  firstWeighingAt: string | null
  firstOperator?: { id: number; fullName: string } | null
  secondWeighingAt: string | null
  secondOperator?: { id: number; fullName: string } | null

  isReturn: boolean
  originalPlumbLogId: number | null
  isActive: boolean
  createdAt: string
}

export interface CreatePlumbLogDto {
  supplierId: number
  customerId: number
  materialId: number
  transportId: number
  objectId?: number
  driverId?: number
  carrierId?: number
  applicationId?: number
  bsuId?: number
  constructionId?: number
  volume?: number
  returnVolume?: number
  sealNumber?: string
  slumpCone?: number
  deliveryType?: string
  nomenclatureId?: number
  impurity?: number
  cleanNet?: number
  documentWeight?: number
  tare?: number
  gross?: number
}

export interface PlumbLogFilters {
  dateFrom?: string
  dateTo?: string
  isActive?: boolean
  isReturn?: boolean
  supplierId?: number
  customerId?: number
  materialId?: number
  applicationId?: number
}
