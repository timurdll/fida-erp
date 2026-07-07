// Нейтральный формат превью — зеркалит backend ReportResult.
// columns/rows выровнены позиционно: row.cells[i] относится к columns[i].
// Строка «Итого» — обычная строка с bold: true (отдельного totals нет).
export type ReportCellValue = string | number | null

export interface ReportColumn {
  header: string
  numFmt?: string
}

export interface ReportRow {
  cells: ReportCellValue[]
  bold?: boolean
}

export interface FidaSummaryApplicationRow {
  dateTime: string
  customerName: string | null
  objectName: string | null
  materialName: string | null
  planVolume: number | null
  factVolume: number | null
  completionPercent: number | null
  reason: string | null
}

export interface FidaSummaryMaterialColumn {
  key: string
  header: string
  values: (number | null)[]
}

export interface FidaSummaryData {
  applicationsTitle: string
  materialsTitle: string
  applications: FidaSummaryApplicationRow[]
  materialColumns: FidaSummaryMaterialColumn[]
  materialRowCount: number
}

export interface ReportResult {
  title: string
  columns: ReportColumn[]
  rows: ReportRow[]
  layout?: 'fida-summary'
  fidaSummary?: FidaSummaryData
}

export type ReportType =
  | 'otvesy-detail'
  | 'otvesy-summary'
  | 'otvesy-deleted'
  | 'otvesy-materials'
  | 'zayavki-summary'
  | 'zayavki-fida-summary'
  | 'zayavki-detail'
  | 'zayavki-deleted'
  | 'vozvrat'

export const REPORT_LABELS: Record<ReportType, string> = {
  'otvesy-detail': 'Детальный отчет',
  'otvesy-summary': 'Сводный отчет',
  'otvesy-deleted': 'Отчёт по удалённым отвесам',
  'otvesy-materials': 'Отчет по материалам',
  'zayavki-summary': 'Сводный отчет',
  'zayavki-fida-summary': 'Сводный отчет Fida',
  'zayavki-detail': 'Детальный отчет',
  'zayavki-deleted': 'Отчёт по удалённым отвесам',
  vozvrat: 'Отчет по возврату',
}

export type FilterKey =
  | 'supplierIds'
  | 'customerIds'
  | 'materialId'
  | 'carrierIds'
  | 'objectIds'
  | 'supplierType'
  | 'customerType'

export const REPORT_FILTER_CONFIG: Record<ReportType, FilterKey[]> = {
  'otvesy-detail': ['supplierIds', 'customerIds', 'materialId', 'carrierIds', 'supplierType'],
  'otvesy-summary': ['supplierIds', 'customerIds', 'carrierIds', 'supplierType'],
  'otvesy-deleted': [],
  'otvesy-materials': ['materialId'],
  'zayavki-summary': ['supplierIds', 'customerIds', 'customerType', 'objectIds'],
  'zayavki-fida-summary': [],
  'zayavki-detail': ['supplierIds', 'customerIds', 'customerType', 'objectIds', 'materialId', 'carrierIds'],
  'zayavki-deleted': [],
  vozvrat: ['supplierIds', 'customerIds'],
}

export const OTVESY_TYPES: ReportType[] = [
  'otvesy-detail',
  'otvesy-summary',
  'otvesy-deleted',
  'otvesy-materials',
]

export const ZAYAVKI_TYPES: ReportType[] = [
  'zayavki-summary',
  'zayavki-fida-summary',
  'zayavki-detail',
  'zayavki-deleted',
  'vozvrat',
]
