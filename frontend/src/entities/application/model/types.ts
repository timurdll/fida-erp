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
  bsuId: number | null
  bsu: { id: number; name: string } | null
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
  supplier: { id: number; name: string; type?: string }
  customerId: number
  customer: { id: number; name: string; type?: string }
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
  slumpCone?: string | null
  note?: string | null
  status: ApplicationStatus
  isActive: boolean
  createdAt: string
  progress: ApplicationProgress
  plumbLogs?: PlumbLogSummary[]
}

export function isWorkedApplication(app: Pick<Application, 'status' | 'progress'>): boolean {
  return app.status === 'COMPLETED' || app.status === 'CANCELLED'
}

/** Возвращает приоритет для сортировки:
 *  0 — IN_PROGRESS / есть отгрузка или погрузка (сверху)
 *  1 — PENDING / не начата (после заявок в работе)
 *  2 — COMPLETED / CANCELLED (снизу)
 */
function sortPriority(app: Pick<Application, 'status' | 'progress'>): number {
  if (app.status === 'COMPLETED' || app.status === 'CANCELLED') return 2
  if (app.status === 'IN_PROGRESS' || app.progress.shippedVolume > 0 || app.progress.loadingVolume > 0) return 0
  return 1
}

export function sortApplicationsWithWorkedLast<T extends Pick<Application, 'status' | 'progress'>>(
  applications: T[],
): T[] {
  return [...applications].sort((a, b) => sortPriority(a) - sortPriority(b))
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
  slumpCone?: string
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

const VOLUME_EPSILON = 0.001

export function formatApplicationVolume(value: number, digits = 2): string {
  return value.toFixed(digits)
}

export function isEarlyCompletedApplication(
  app: Pick<Application, 'status' | 'targetVolume' | 'progress'>,
): boolean {
  return (
    app.status === 'COMPLETED' &&
    app.progress.shippedVolume + VOLUME_EPSILON < app.targetVolume
  )
}

export function getApplicationTargetVolumeLabel(
  app: Pick<Application, 'status' | 'targetVolume' | 'progress'>,
  digits = 2,
): string {
  if (!isEarlyCompletedApplication(app)) {
    return formatApplicationVolume(app.targetVolume, digits)
  }

  return `${formatApplicationVolume(app.progress.shippedVolume, digits)} (${formatApplicationVolume(app.targetVolume, digits)})`
}

export function getApplicationProgressDisplay(
  app: Pick<Application, 'status' | 'targetVolume' | 'progress'>,
) {
  const isCompleted = app.status === 'COMPLETED'
  const shipped = app.progress.shippedVolume
  const loading = isCompleted ? 0 : app.progress.loadingVolume
  const total = isEarlyCompletedApplication(app) ? shipped : app.targetVolume
  const remain = isCompleted ? 0 : Math.max(total - shipped - loading, 0)

  return {
    shipped,
    loading,
    total,
    remain,
    isCompleted,
    targetVolumeLabel: getApplicationTargetVolumeLabel(app),
  }
}
