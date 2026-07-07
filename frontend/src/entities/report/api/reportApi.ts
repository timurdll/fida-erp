import type { CompanyType } from '@/entities/company/model/types'
import { REPORT_LABELS } from '../model/types'
import type { ReportResult, ReportType } from '../model/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

export interface ReportFilters {
  supplierIds?: number[]
  customerIds?: number[]
  materialId?: number
  carrierIds?: number[]
  objectIds?: number[]
  supplierType?: CompanyType
  customerType?: CompanyType
}

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${d.getFullYear()}`
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null
  try {
    const { useAuthStore } = await import('@/shared/store/auth.store')
    return useAuthStore.getState().token
  } catch {
    return null
  }
}

function appendIds(params: URLSearchParams, key: string, ids?: number[]) {
  if (!ids?.length) return
  for (const id of ids) {
    params.append(key, String(id))
  }
}

function buildParams(dateFrom: Date, dateTo: Date, filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set('dateFrom', dateFrom.toISOString())
  params.set('dateTo', dateTo.toISOString())
  appendIds(params, 'supplierIds', filters.supplierIds)
  appendIds(params, 'customerIds', filters.customerIds)
  if (filters.materialId !== undefined) params.set('materialId', String(filters.materialId))
  appendIds(params, 'carrierIds', filters.carrierIds)
  appendIds(params, 'objectIds', filters.objectIds)
  if (filters.supplierType !== undefined) params.set('supplierType', filters.supplierType)
  if (filters.customerType !== undefined) params.set('customerType', filters.customerType)
  return params
}

export async function fetchReportPreview(
  type: ReportType,
  dateFrom: Date,
  dateTo: Date,
  filters: ReportFilters,
): Promise<ReportResult> {
  const token = await getAuthToken()
  const params = buildParams(dateFrom, dateTo, filters)
  params.set('format', 'json')

  const res = await fetch(`${API_BASE_URL}/reports/${type}?${params}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Ошибка формирования отчёта')
  }

  return (await res.json()) as ReportResult
}

/** Скачивает .xlsx и возвращает Blob (родитель создаёт blob: URL для попапа превью). */
export async function fetchReportBlob(
  type: ReportType,
  dateFrom: Date,
  dateTo: Date,
  filters: ReportFilters,
): Promise<Blob> {
  const token = await getAuthToken()
  const params = buildParams(dateFrom, dateTo, filters)

  const res = await fetch(`${API_BASE_URL}/reports/${type}?${params}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error((err as { message?: string }).message ?? 'Ошибка формирования отчёта')
  }

  return res.blob()
}

/** Имя файла отчёта: «<Название>_<dd.MM.yyyy>-<dd.MM.yyyy>.xlsx», пробелы → «_». */
export function reportFilename(type: ReportType, dateFrom: Date, dateTo: Date): string {
  const label = REPORT_LABELS[type].replace(/ /g, '_')
  return `${label}_${fmtDate(dateFrom)}-${fmtDate(dateTo)}.xlsx`
}
