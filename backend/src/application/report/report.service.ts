import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { REPORT_REPOSITORY } from '../../domain/report/i-report.repository';
import type {
  IReportRepository,
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

/** Формат ячеек «заезд/выезд» и «Дата»: dd-MM-yyyy HH:mm (тире). */
function fmtCell(d: Date | null): string {
  if (!d) return '';
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Формат дат в заголовке отчёта: dd.MM.yyyy HH:mm (точки). */
function fmtTitle(d: Date): string {
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Две строки в одной ячейке: firstWeighingAt и secondWeighingAt (пустые отбрасываем). */
function entryExit(r: ReportPlumbRow): string {
  return [r.firstWeighingAt, r.secondWeighingAt]
    .map(fmtCell)
    .filter(Boolean)
    .join('\n');
}

/** Плотность / У-в: round(net/volume), если оба заданы; иначе null (НЕ ноль). */
function density(net: number | null, volume: number | null): number | null {
  if (net == null || volume == null || volume === 0) return null;
  return Math.round(net / volume);
}

function cols(...defs: [string, string?][]): ReportColumn[] {
  return defs.map(([header, numFmt]) => ({ header, numFmt }));
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
        i + 1, r.id, entryExit(r),
        r.supplierName, r.carrierName, r.plateNumber, r.materialName,
        r.net, r.gross, r.tare,
        r.operatorName, r.note, r.nomenclatureName,
      ],
    }));
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
        i + 1, entryExit(r),
        r.supplierName, r.carrierName, r.plateNumber, r.materialName,
        r.net, r.gross, r.tare, r.operatorName, r.note,
      ],
    }));
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
