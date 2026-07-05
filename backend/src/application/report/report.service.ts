import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REPORT_REPOSITORY } from '../../domain/report/i-report.repository';
import type {
  IReportRepository,
  ReportApplicationRow,
  ReportFilters,
  ReportPlumbRow,
} from '../../domain/report/i-report.repository';
import { ReportType } from '../../domain/report/report.types';
import type {
  ReportColumn,
  ReportResult,
  ReportRow,
} from '../../domain/report/report.types';

const NAMES: Record<ReportType, string> = {
  [ReportType.OTVESY_DETAIL]: 'Детальный отчёт по отвесам',
  [ReportType.OTVESY_SUMMARY]: 'Сводный отчёт по отвесам',
  [ReportType.OTVESY_DELETED]: 'Отчёт по удалённым отвесам (независимые)',
  [ReportType.OTVESY_MATERIALS]: 'Отчёт по материалам',
  [ReportType.ZAYAVKI_SUMMARY]: 'Сводный отчёт по заявкам',
  [ReportType.ZAYAVKI_FIDA_SUMMARY]: 'Сводный отчёт Fida',
  [ReportType.ZAYAVKI_DETAIL]: 'Детальный отчёт по заявкам',
  [ReportType.ZAYAVKI_DELETED]: 'Отчёт по удалённым отвесам (зависимые)',
  [ReportType.VOZVRAT]: 'Отчёт по возврату',
};

const INT = '0';
// Кубатура: показываем дробную часть только если она есть (3 → «3», 3.5 → «3.5»),
// как в превью. '0.00' давал «3,00» — расхождение с превью.
const FLOAT2 = '0.##';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Принудительно переводим дату в таймзону Казахстана (UTC+5) для форматирования */
function getKZDate(d: Date): Date {
  return new Date(d.getTime() + 5 * 60 * 60 * 1000);
}

/** Формат ячеек «заезд/выезд» и «Дата»: dd-MM-yyyy HH:mm (тире). */
function fmtCell(d: Date | null): string {
  if (!d) return '';
  const kz = getKZDate(d);
  return `${pad2(kz.getUTCDate())}-${pad2(kz.getUTCMonth() + 1)}-${kz.getUTCFullYear()} ${pad2(kz.getUTCHours())}:${pad2(kz.getUTCMinutes())}`;
}

/** Формат дат в заголовке отчёта: dd.MM.yyyy HH:mm (точки). */
function fmtTitle(d: Date): string {
  const kz = getKZDate(d);
  return `${pad2(kz.getUTCDate())}.${pad2(kz.getUTCMonth() + 1)}.${kz.getUTCFullYear()} ${pad2(kz.getUTCHours())}:${pad2(kz.getUTCMinutes())}`;
}

/** Формат заголовков Fida: dd-MM-yyyy HH:mm (как в старом печатном отчёте). */
function fmtFidaTitle(d: Date): string {
  const kz = getKZDate(d);
  return `${pad2(kz.getUTCDate())}-${pad2(kz.getUTCMonth() + 1)}-${kz.getUTCFullYear()} ${pad2(kz.getUTCHours())}:${pad2(kz.getUTCMinutes())}`;
}

function fmtApplicationDate(r: ReportApplicationRow): string {
  const kz = getKZDate(r.deliveryDate);
  const date = `${pad2(kz.getUTCDate())}-${pad2(kz.getUTCMonth() + 1)}-${kz.getUTCFullYear()}`;
  return [date, r.deliveryTime].filter(Boolean).join('\n');
}

/** Две строки в одной ячейке: заезд/выезд. У сырья сначала брутто, потом тара. */
function entryExit(r: ReportPlumbRow, kind: 'concrete' | 'material' = 'concrete'): string {
  const values =
    kind === 'material'
      ? [r.secondWeighingAt, r.firstWeighingAt]
      : [r.firstWeighingAt, r.secondWeighingAt];
  return values
    .map(fmtCell)
    .filter(Boolean)
    .join('\n');
}

/** Плотность / У-в: round(net/volume), если оба заданы; иначе null (НЕ ноль). */
function density(net: number | null, volume: number | null): number | null {
  if (net == null || volume == null || volume === 0) return null;
  return Math.round(net / volume);
}

/** Фактическая отгрузка заявки — только завершённые отвесы, где уже есть брутто. */
function applicationFact(r: ReportApplicationRow): number {
  return r.plumbLogs
    .filter((p) => p.gross !== null)
    .reduce((sum, p) => sum + (p.volume ?? 0), 0);
}

function percent(fact: number, plan: number): number | null {
  if (!plan) return null;
  return Math.round((fact / plan) * 100);
}

function cols(...defs: [string, string?][]): ReportColumn[] {
  return defs.map(([header, numFmt]) => ({ header, numFmt }));
}

function addNetTotalRow(
  data: ReportRow[],
  totalColumns: number,
  labelIndex: number,
  netIndex: number,
  rows: ReportPlumbRow[],
): void {
  const total = rows.reduce((sum, row) => sum + (row.net ?? 0), 0);
  const cells: ReportRow['cells'] = Array.from({ length: totalColumns }, () => null);
  cells[labelIndex] = 'Итого';
  cells[netIndex] = total;
  data.push({ cells, bold: true });
}

/** Итоговая строка детального отчёта по заявкам: Σ нетто и Σ кубатура. */
function addZayavkiDetailTotalRow(
  data: ReportRow[],
  totalColumns: number,
  rows: ReportPlumbRow[],
): void {
  const totalNet = rows.reduce((sum, row) => sum + (row.net ?? 0), 0);
  const totalVolume = rows.reduce((sum, row) => sum + (row.volume ?? 0), 0);
  const cells: ReportRow['cells'] = Array.from({ length: totalColumns }, () => null);
  cells[7] = 'Итого';
  cells[8] = totalNet;
  cells[11] = totalVolume;
  data.push({ cells, bold: true });
}

@Injectable()
export class ReportService {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly repo: IReportRepository,
  ) {}

  async build(type: ReportType, filters: ReportFilters): Promise<ReportResult> {
    switch (type) {
      case ReportType.OTVESY_DETAIL:
        return this.otvesyDetail(filters);
      case ReportType.OTVESY_SUMMARY:
        return this.otvesySummary(filters);
      case ReportType.OTVESY_DELETED:
        return this.otvesyDeleted(filters);
      case ReportType.OTVESY_MATERIALS:
        return this.otvesyMaterials(filters);
      case ReportType.ZAYAVKI_SUMMARY:
        return this.zayavkiSummary(filters);
      case ReportType.ZAYAVKI_FIDA_SUMMARY:
        return this.zayavkiFidaSummary(filters);
      case ReportType.ZAYAVKI_DETAIL:
        return this.zayavkiDetail(filters);
      case ReportType.ZAYAVKI_DELETED:
        return this.zayavkiDeleted(filters);
      case ReportType.VOZVRAT:
        return this.vozvrat(filters);
      default:
        throw new BadRequestException(`Неизвестный тип отчёта: ${type}`);
    }
  }

  private title(type: ReportType, f: ReportFilters): string {
    return `${NAMES[type]} с ${fmtTitle(f.dateFrom)} по ${fmtTitle(f.dateTo)}`;
  }

  /** Берём только разрешённые для отчёта опциональные фильтры (даты всегда). */
  private pick(f: ReportFilters, keys: (keyof ReportFilters)[]): ReportFilters {
    const out: ReportFilters = { dateFrom: f.dateFrom, dateTo: f.dateTo };
    for (const k of keys) {
      const v = f[k];
      if (v !== undefined) (out as any)[k] = v;
    }
    return out;
  }

  // ───────── Вкладка «Отвесы» ─────────

  // 1. Детальный по отвесам
  private async otvesyDetail(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findIndependentActive(
      this.pick(f, ['supplierId', 'customerId', 'materialId', 'carrierId', 'supplierType']),
    );
    const columns = cols(
      ['№', INT], ['Номер наклад.', INT], ['Дата и время заезда/выезда'],
      ['Контрагент'], ['Перевозчик'], ['Номер машины'], ['Груз'],
      ['Нетто', INT], ['Брутто', INT], ['Тара', INT],
      ['Оператор'], ['Примечание'], ['Номер силоса'],
    );
    const data: ReportRow[] = rows.map((r, i) => ({
      cells: [
        i + 1, r.id, entryExit(r, 'material'),
        r.supplierName, r.carrierName, r.plateNumber, r.materialName,
        r.net, r.gross, r.tare,
        r.operatorName, r.note, r.nomenclatureName,
      ],
    }));
    addNetTotalRow(data, columns.length, 6, 7, rows);
    return { title: this.title(ReportType.OTVESY_DETAIL, f), columns, rows: data };
  }

  // 2. Сводный по отвесам — группировка (поставщик, перевозчик, материал), Σnet
  private async otvesySummary(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findIndependentActive(
      this.pick(f, ['supplierId', 'customerId', 'carrierId', 'supplierType']),
    );
    const map = new Map<string, { supplier: string; carrier: string; material: string; sum: number }>();
    for (const r of rows) {
      const key = `${r.supplierId}|${r.carrierId ?? 0}|${r.materialId}`;
      const e = map.get(key) ?? {
        supplier: r.supplierName ?? '', carrier: r.carrierName ?? '', material: r.materialName ?? '', sum: 0,
      };
      e.sum += r.net ?? 0;
      map.set(key, e);
    }
    const groups = [...map.values()].sort(
      (a, b) => a.supplier.localeCompare(b.supplier, 'ru') || a.material.localeCompare(b.material, 'ru'),
    );
    const total = groups.reduce((s, g) => s + g.sum, 0);
    const columns = cols(['Контрагент'], ['Перевозчик'], ['Материал'], ['Вес', INT]);
    const data: ReportRow[] = groups.map((g) => ({ cells: [g.supplier, g.carrier, g.material, g.sum] }));
    data.push({ cells: ['', '', 'Итого', total], bold: true });
    return { title: this.title(ReportType.OTVESY_SUMMARY, f), columns, rows: data };
  }

  // 3. Удалённые отвесы (независимые)
  private async otvesyDeleted(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findIndependentDeleted(this.pick(f, []));
    const columns = cols(
      ['№', INT], ['Дата и время заезда/выезда'],
      ['Контрагент'], ['Перевозчик'], ['Номер машины'], ['Груз'],
      ['Нетто', INT], ['Брутто', INT], ['Тара', INT], ['Оператор'], ['Примечание'],
    );
    const data: ReportRow[] = rows.map((r, i) => ({
      cells: [
        i + 1, entryExit(r, 'material'),
        r.supplierName, r.carrierName, r.plateNumber, r.materialName,
        r.net, r.gross, r.tare, r.operatorName, r.note,
      ],
    }));
    addNetTotalRow(data, columns.length, 5, 6, rows);
    return { title: this.title(ReportType.OTVESY_DELETED, f), columns, rows: data };
  }

  // 4. По материалам — группировка по материалу, Σnet
  private async otvesyMaterials(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findIndependentActive(this.pick(f, ['materialId']));
    const map = new Map<number, { material: string; sum: number }>();
    for (const r of rows) {
      const e = map.get(r.materialId) ?? { material: r.materialName ?? '', sum: 0 };
      e.sum += r.net ?? 0;
      map.set(r.materialId, e);
    }
    const groups = [...map.values()].sort((a, b) => a.material.localeCompare(b.material, 'ru'));
    const total = groups.reduce((s, g) => s + g.sum, 0);
    const columns = cols(['Материал'], ['Нетто', INT]);
    const data: ReportRow[] = groups.map((g) => ({ cells: [g.material, g.sum] }));
    data.push({ cells: ['Итого', total], bold: true });
    return { title: this.title(ReportType.OTVESY_MATERIALS, f), columns, rows: data };
  }

  // ───────── Вкладка «Заявки» ─────────

  // 5. Сводный по заявкам — группировка (заказчик, объект, материал), Σvolume
  private async zayavkiSummary(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findDependentActive(
      this.pick(f, ['supplierId', 'customerId', 'customerType', 'objectId']),
    );
    const map = new Map<string, { customer: string; object: string; material: string; sum: number }>();
    for (const r of rows) {
      const key = `${r.customerId}|${r.objectId ?? 0}|${r.materialId}`;
      const e = map.get(key) ?? {
        customer: r.customerName ?? '', object: r.objectName ?? '', material: r.materialName ?? '', sum: 0,
      };
      e.sum += r.volume ?? 0;
      map.set(key, e);
    }
    const groups = [...map.values()].sort(
      (a, b) => a.customer.localeCompare(b.customer, 'ru') || a.object.localeCompare(b.object, 'ru'),
    );
    const total = groups.reduce((s, g) => s + g.sum, 0);
    const columns = cols(['Заказчик'], ['Объект'], ['Материал'], ['Кубатура', FLOAT2]);
    const data: ReportRow[] = groups.map((g) => ({ cells: [g.customer, g.object, g.material, g.sum] }));
    data.push({ cells: ['', '', 'Итого', total], bold: true });
    return { title: this.title(ReportType.ZAYAVKI_SUMMARY, f), columns, rows: data };
  }

  private async zayavkiFidaSummary(f: ReportFilters): Promise<ReportResult> {
    const [applications, materialRows] = await Promise.all([
      this.repo.findApplications(this.pick(f, [])),
      this.repo.findIndependentActive(this.pick(f, [])),
    ]);

    const appRows = applications.map((app) => {
      const fact = applicationFact(app);
      const completionPercent = percent(fact, app.targetVolume);
      return {
        dateTime: fmtApplicationDate(app),
        customerName: app.customerName,
        objectName: app.objectName,
        materialName: app.materialName,
        planVolume: app.targetVolume,
        factVolume: fact,
        completionPercent,
        reason:
          completionPercent !== null && completionPercent < 100
            ? app.note
            : null,
      };
    });

    const materialMap = new Map<
      string,
      { material: string; supplier: string; values: number[] }
    >();
    for (const row of materialRows) {
      if (row.net === null) continue;
      const key = `${row.materialId}|${row.supplierId}`;
      const entry = materialMap.get(key) ?? {
        material: row.materialName ?? '',
        supplier: row.supplierName ?? '',
        values: [],
      };
      entry.values.push(row.net);
      materialMap.set(key, entry);
    }

    const materialColumns = [...materialMap.entries()]
      .map(([key, value]) => ({
        key,
        material: value.material,
        supplier: value.supplier,
        header: [value.material, value.supplier].filter(Boolean).join('\n'),
        values: value.values,
      }))
      .sort(
        (a, b) =>
          a.material.localeCompare(b.material, 'ru') ||
          a.supplier.localeCompare(b.supplier, 'ru'),
      )
      .map(({ key, header, values }) => ({ key, header, values }));

    const materialRowCount = materialColumns.reduce(
      (max, col) => Math.max(max, col.values.length),
      0,
    );

    return {
      title: this.title(ReportType.ZAYAVKI_FIDA_SUMMARY, f),
      columns: [],
      rows: [],
      layout: 'fida-summary',
      fidaSummary: {
        applicationsTitle: `Заявки на бетон с ${fmtFidaTitle(f.dateFrom)} по ${fmtFidaTitle(f.dateTo)}`,
        materialsTitle: `Поступление инертного материала с ${fmtFidaTitle(f.dateFrom)} по ${fmtFidaTitle(f.dateTo)}`,
        applications: appRows,
        materialColumns,
        materialRowCount,
      },
    };
  }

  // 6. Детальный по заявкам
  private async zayavkiDetail(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findDependentActive(
      this.pick(f, ['supplierId', 'customerId', 'customerType', 'objectId', 'materialId', 'carrierId']),
    );
    const columns = cols(
      ['№', INT], ['Номер наклад.', INT], ['Дата и время заезда/выезда'],
      ['Заказчик'], ['Объект'], ['Номер машины'], ['Марка б/р'], ['Перевозчик'],
      ['Нетто', INT], ['Брутто', INT], ['Тара', INT], ['Кубатура', FLOAT2],
      ['Плотность', INT], ['Диспетчер'],
    );
    const data: ReportRow[] = rows.map((r, i) => ({
      cells: [
        i + 1, r.id, entryExit(r),
        r.customerName, r.objectName, r.plateNumber, r.materialName, r.carrierName,
        r.net, r.gross, r.tare, r.volume, density(r.net, r.volume), r.operatorName,
      ],
    }));
    addZayavkiDetailTotalRow(data, columns.length, rows);
    return { title: this.title(ReportType.ZAYAVKI_DETAIL, f), columns, rows: data };
  }

  // 7. Удалённые отвесы (зависимые)
  private async zayavkiDeleted(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findDependentDeleted(this.pick(f, []));
    const columns = cols(
      ['№', INT], ['Дата и время заезда/выезда'],
      ['Заказчик'], ['Объект'], ['Номер машины'], ['Марка б/р'], ['Перевозчик'],
      ['Нетто', INT], ['Брутто', INT], ['Тара', INT], ['Кубатура', FLOAT2],
      ['Плотность', INT], ['Диспетчер'], ['Примечание'],
    );
    const data: ReportRow[] = rows.map((r, i) => ({
      cells: [
        i + 1, entryExit(r),
        r.customerName, r.objectName, r.plateNumber, r.materialName, r.carrierName,
        r.net, r.gross, r.tare, r.volume, density(r.net, r.volume), r.operatorName, r.note,
      ],
    }));
    addNetTotalRow(data, columns.length, 6, 7, rows);
    return { title: this.title(ReportType.ZAYAVKI_DELETED, f), columns, rows: data };
  }

  // 8. Возврат — Заказчик = supplier записи-возврата (исходный заказчик)
  private async vozvrat(f: ReportFilters): Promise<ReportResult> {
    const rows = await this.repo.findReturns(this.pick(f, ['supplierId', 'customerId']));
    const columns = cols(
      ['ID', INT], ['Дата'], ['Гос.номер'], ['Заказчик'], ['Марка бетона'],
      ['Брутто', INT], ['Тара', INT], ['Нетто', INT], ['У/в', INT], ['М3', FLOAT2],
      ['Тип возврата'], ['Примечание'],
    );
    const data: ReportRow[] = rows.map((r) => ({
      cells: [
        r.id, fmtCell(r.firstWeighingAt), r.plateNumber, r.supplierName, r.materialName,
        r.gross, r.tare, r.net, density(r.net, r.volume), r.volume, '', r.note,
      ],
    }));
    return { title: this.title(ReportType.VOZVRAT, f), columns, rows: data };
  }
}
