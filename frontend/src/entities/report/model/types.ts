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

export interface ReportResult {
  title: string
  columns: ReportColumn[]
  rows: ReportRow[]
}

export type ReportType =
  | 'otvesy-detail'
  | 'otvesy-summary'
  | 'otvesy-deleted'
  | 'otvesy-materials'
  | 'zayavki-summary'
  | 'zayavki-detail'
  | 'zayavki-deleted'
  | 'vozvrat'

export const REPORT_LABELS: Record<ReportType, string> = {
  'otvesy-detail': 'Детальный отчет',
  'otvesy-summary': 'Сводный отчет',
  'otvesy-deleted': 'Отчёт по удалённым отвесам',
  'otvesy-materials': 'Отчет по материалам',
  'zayavki-summary': 'Сводный отчет',
  'zayavki-detail': 'Детальный отчет',
  'zayavki-deleted': 'Отчёт по удалённым отвесам',
  vozvrat: 'Отчет по возврату',
}

export type FilterKey =
  | 'supplierId'
  | 'customerId'
  | 'materialId'
  | 'carrierId'
  | 'objectId'
  | 'supplierType'
  | 'customerType'

export const REPORT_FILTER_CONFIG: Record<ReportType, FilterKey[]> = {
  'otvesy-detail': ['supplierId', 'customerId', 'materialId', 'carrierId', 'supplierType'],
  'otvesy-summary': ['supplierId', 'customerId', 'carrierId', 'supplierType'],
  'otvesy-deleted': [],
  'otvesy-materials': ['materialId'],
  'zayavki-summary': ['supplierId', 'customerId', 'customerType', 'objectId'],
  'zayavki-detail': ['supplierId', 'customerId', 'customerType', 'objectId', 'materialId', 'carrierId'],
  'zayavki-deleted': [],
  vozvrat: ['supplierId', 'customerId'],
}

export const OTVESY_TYPES: ReportType[] = [
  'otvesy-detail',
  'otvesy-summary',
  'otvesy-deleted',
  'otvesy-materials',
]

export const ZAYAVKI_TYPES: ReportType[] = [
  'zayavki-summary',
  'zayavki-detail',
  'zayavki-deleted',
  'vozvrat',
]
