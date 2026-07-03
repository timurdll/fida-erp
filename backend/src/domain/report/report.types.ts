// Типы для модуля «Отчёты» (нейтральный формат, не зависящий от exceljs)

export enum ReportType {
  OTVESY_DETAIL = 'otvesy-detail', // 1. Детальный отчёт по отвесам
  OTVESY_SUMMARY = 'otvesy-summary', // 2. Сводный отчёт по отвесам
  OTVESY_DELETED = 'otvesy-deleted', // 3. Удалённые отвесы (независимые)
  OTVESY_MATERIALS = 'otvesy-materials', // 4. Отчёт по материалам
  ZAYAVKI_SUMMARY = 'zayavki-summary', // 5. Сводный отчёт по заявкам
  ZAYAVKI_FIDA_SUMMARY = 'zayavki-fida-summary', // 5a. Сводный отчёт Fida
  ZAYAVKI_DETAIL = 'zayavki-detail', // 6. Детальный отчёт по заявкам
  ZAYAVKI_DELETED = 'zayavki-deleted', // 7. Удалённые отвесы (зависимые)
  VOZVRAT = 'vozvrat', // 8. Отчёт по возврату
}

export const REPORT_TYPES: ReportType[] = Object.values(ReportType);

export type ReportCellValue = string | number | null;

export interface ReportColumn {
  header: string;
  /** Числовой формат exceljs для ячеек данных, напр. '0' или '0.00'. Для текста — не задаётся. */
  numFmt?: string;
}

export interface ReportRow {
  cells: ReportCellValue[]; // выровнены по columns
  bold?: boolean; // для строки «Итого»
}

export interface FidaSummaryApplicationRow {
  dateTime: string;
  customerName: string | null;
  objectName: string | null;
  materialName: string | null;
  planVolume: number | null;
  factVolume: number | null;
  completionPercent: number | null;
  reason: string | null;
}

export interface FidaSummaryMaterialColumn {
  key: string;
  header: string;
  values: (number | null)[];
}

export interface FidaSummaryData {
  applicationsTitle: string;
  materialsTitle: string;
  applications: FidaSummaryApplicationRow[];
  materialColumns: FidaSummaryMaterialColumn[];
  materialRowCount: number;
}

export interface ReportResult {
  /** Строка 1 листа: «<Название отчёта> с <dateFrom> по <dateTo>» */
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  layout?: 'fida-summary';
  fidaSummary?: FidaSummaryData;
}
