export type ApplicationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export const APP_STATUS_LABEL: Record<ApplicationStatus, string> = {
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В процессе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
}

export interface ApplicationProgress {
  shippedVolume: number
  loadingVolume: number
  remainVolume: number
  totalPlumbs: number
}

export interface PlumbLogSummary {
  id: number
  tare: number
  gross: number | null
  net: number | null
  volume: number | null
  bsuNumber: string | null
  firstWeighingAt: string | null
  secondWeighingAt: string | null
  transport?: { id: number; plateNumber: string } | null
  driver?: { id: number; fullName: string } | null
  isReturn: boolean
  isActive: boolean
}

export interface Application {
  id: number
  supplierId: number
  supplier: { id: number; name: string }
  customerId: number
  customer: { id: number; name: string }
  objectId: number
  object: { id: number; name: string; address?: string }
  materialId: number
  material: { id: number; name: string; type: string }
  constructionId?: number | null
  construction?: { id: number; name: string } | null
  deliveryMethodId?: number | null
  deliveryMethod?: { id: number; name: string } | null
  authorId: number
  author: { id: number; fullName: string }
  targetVolume: number
  deliveryDate: string
  deliveryTime: string | null
  loadingInterval: number | null
  slumpCone?: number | null
  note?: string | null
  status: ApplicationStatus
  isActive: boolean
  createdAt: string
  progress: ApplicationProgress
  plumbLogs?: PlumbLogSummary[]
}

export interface CreateApplicationDto {
  supplierId: number
  customerId: number
  objectId: number
  materialId: number
  constructionId?: number
  deliveryMethodId?: number
  targetVolume: number
  deliveryDate: string // YYYY-MM-DD
  deliveryTime: string // HH:mm
  loadingInterval: number
  slumpCone?: number
  note?: string
}

export interface ApplicationFilters {
  deliveryDate?: string
  isActive?: boolean
  status?: ApplicationStatus
  supplierId?: number
  customerId?: number
  materialId?: number
}
