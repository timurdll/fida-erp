import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type {
  FidaSummaryData,
  ReportCellValue,
  ReportResult,
} from '../../domain/report/report.types';

@Injectable()
export class ReportExcelBuilder {
  async build(result: ReportResult): Promise<Buffer> {
    if (result.layout === 'fida-summary' && result.fidaSummary) {
      return this.buildFidaSummary(result.fidaSummary);
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Отчёт');
    const n = result.columns.length;

    const thin: Partial<ExcelJS.Border> = {
      style: 'thin',
      color: { argb: 'FF000000' },
    };
    const allBorders: Partial<ExcelJS.Borders> = {
      top: thin,
      left: thin,
      bottom: thin,
      right: thin,
    };

    // Строка 1 — заголовок отчёта (merge на всю ширину таблицы, по центру)
    ws.mergeCells(1, 1, 1, n);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = result.title;
    titleCell.font = { bold: true, size: 12 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 22;

    // Строка 2 — заголовки колонок (жирные, по центру, серая заливка, рамки)
    const headerRow = ws.getRow(2);
    result.columns.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' },
      };
      cell.border = allBorders;
    });

    // Данные — с 3-й строки
    result.rows.forEach((row, ri) => {
      const r = ws.getRow(3 + ri);
      result.columns.forEach((_, ci) => {
        const val = row.cells[ci];
        const cell = r.getCell(ci + 1);
        const isNumber = typeof val === 'number';

        if (val !== null && val !== undefined) {
          cell.value = val;
          const numFmt = result.columns[ci]?.numFmt;
          if (numFmt && isNumber) cell.numFmt = numFmt;
        }
        // null/undefined → значение не пишем (пустая ячейка), но рамку/выравнивание ставим

        cell.alignment = {
          // числа вправо, текст влево — как в превью
          horizontal: isNumber ? 'right' : 'left',
          vertical: 'top',
          // перенос только для многострочных ячеек («заезд/выезд»)
          wrapText: typeof val === 'string' && val.includes('\n'),
        };
        cell.border = allBorders;
        if (row.bold) cell.font = { bold: true };
      });
    });

    // Ширина колонок: по содержимому (заголовок + данные), затем гарантируем,
    // что объединённая строка заголовка вмещает текст целиком (иначе он обрезается).
    const widths = result.columns.map((c, ci) => {
      let max = c.header.length;
      for (const row of result.rows) {
        const v = row.cells[ci];
        if (v === null || v === undefined) continue;
        const len =
          typeof v === 'string'
            ? Math.max(0, ...v.split('\n').map((s) => s.length))
            : String(v).length;
        if (len > max) max = len;
      }
      return Math.min(50, Math.max(10, max + 2));
    });

    // Заголовок отчёта длиннее суммы ширин → равномерно расширяем колонки,
    // чтобы merged-ячейка показала заголовок целиком (а не обрезала «…23»).
    const titleNeeded = result.title.length + 2;
    const sum = widths.reduce((a, b) => a + b, 0);
    if (sum < titleNeeded) {
      const add = Math.ceil((titleNeeded - sum) / n);
      for (let i = 0; i < n; i++) widths[i] += add;
    }
    widths.forEach((w, ci) => {
      ws.getColumn(ci + 1).width = w;
    });

    const buffer = await wb.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  private async buildFidaSummary(data: FidaSummaryData): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Fida');

    const leftHeaders = [
      '',
      'ТОО',
      'Объект',
      'Марка',
      'План',
      'Факт',
      '%\nисполнения',
      'Причины\nнеисполнения',
    ];
    const rightHeaders = ['№', ...data.materialColumns.map((c) => c.header)];
    const leftCount = leftHeaders.length;
    const rightStart = leftCount + 1;
    const totalColumns = leftCount + rightHeaders.length;
    const rowsCount = Math.max(data.applications.length, data.materialRowCount);

    ws.pageSetup = {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };

    const thin: Partial<ExcelJS.Border> = {
      style: 'thin',
      color: { argb: 'FF000000' },
    };
    const medium: Partial<ExcelJS.Border> = {
      style: 'medium',
      color: { argb: 'FF000000' },
    };
    const allBorders: Partial<ExcelJS.Borders> = {
      top: thin,
      left: thin,
      bottom: thin,
      right: thin,
    };

    const setSectionBorder = (cell: ExcelJS.Cell, isRightSection = false) => {
      cell.border = {
        ...allBorders,
        ...(isRightSection ? { left: medium } : {}),
      };
    };

    ws.mergeCells(1, 1, 1, leftCount);
    ws.mergeCells(1, rightStart, 1, totalColumns);

    const leftTitle = ws.getCell(1, 1);
    leftTitle.value = data.applicationsTitle;
    leftTitle.font = { bold: true, size: 12 };
    leftTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setSectionBorder(leftTitle);

    const rightTitle = ws.getCell(1, rightStart);
    rightTitle.value = data.materialsTitle;
    rightTitle.font = { bold: true, size: 12 };
    rightTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    setSectionBorder(rightTitle, true);
    ws.getRow(1).height = 18;

    const headerRow = ws.getRow(2);
    [...leftHeaders, ...rightHeaders].forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, size: 12 };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      setSectionBorder(cell, index + 1 === rightStart);
    });
    headerRow.height = 58;

    for (let i = 0; i < rowsCount; i++) {
      const app = data.applications[i];
      const materialNumber = i < data.materialRowCount ? i + 1 : null;
      const values: ReportCellValue[] = [
        app?.dateTime ?? null,
        app?.customerName ?? null,
        app?.objectName ?? null,
        app?.materialName ?? null,
        app?.planVolume ?? null,
        app?.factVolume ?? null,
        app?.completionPercent !== null && app?.completionPercent !== undefined
          ? `${app.completionPercent}%`
          : null,
        app?.reason ?? null,
        materialNumber,
        ...data.materialColumns.map((col) => col.values[i] ?? null),
      ];

      const row = ws.getRow(i + 3);
      values.forEach((value, index) => {
        const cell = row.getCell(index + 1);
        if (value !== null && value !== undefined) {
          cell.value = value;
          if (typeof value === 'number' && !Number.isInteger(value)) {
            cell.numFmt = '0.##';
          }
        }
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: typeof value === 'string' && value.includes('\n'),
        };
        setSectionBorder(cell, index + 1 === rightStart);
      });
      row.height = 42;
    }

    // --- Добавление строки ИТОГО в таблицу ---
    const summaryRowIndex = 3 + rowsCount;
    const summaryRow = ws.getRow(summaryRowIndex);
    
    // Подсчет сумм по заявкам
    let totalPlan = 0;
    let totalFact = 0;
    for (const app of data.applications) {
      if (app?.planVolume) totalPlan += app.planVolume;
      if (app?.factVolume) totalFact += app.factVolume;
    }
    const totalPercent = totalPlan > 0 ? Math.round((totalFact / totalPlan) * 100) : 0;

    // Левая часть (Заявки)
    summaryRow.getCell(2).value = 'ИТОГО';
    summaryRow.getCell(2).font = { bold: true };
    summaryRow.getCell(5).value = totalPlan;
    summaryRow.getCell(5).font = { bold: true };
    summaryRow.getCell(6).value = totalFact;
    summaryRow.getCell(6).font = { bold: true };
    summaryRow.getCell(7).value = `${totalPercent}%`;
    summaryRow.getCell(7).font = { bold: true };

    for (let i = 1; i <= leftCount; i++) {
      const cell = summaryRow.getCell(i);
      setSectionBorder(cell, false);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    // Правая часть (Материалы)
    summaryRow.getCell(rightStart).value = 'Итого';
    summaryRow.getCell(rightStart).font = { bold: true };
    data.materialColumns.forEach((col, index) => {
      const cell = summaryRow.getCell(rightStart + 1 + index);
      const sum = col.values.reduce((a: number, b) => a + (b ?? 0), 0);
      cell.value = sum;
      cell.font = { bold: true };
    });

    for (let i = rightStart; i <= totalColumns; i++) {
      const cell = summaryRow.getCell(i);
      setSectionBorder(cell, i === rightStart);
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    summaryRow.height = 25;

    // --- Блок "Заявки Fida" под таблицей ---
    const boxStartRow = summaryRowIndex + 2; // пропускаем одну пустую строку

    // Шапка
    ws.mergeCells(boxStartRow, 4, boxStartRow, 5);
    const boxHeader = ws.getCell(boxStartRow, 4);
    boxHeader.value = 'Заявки Fida';
    boxHeader.font = { bold: true };
    boxHeader.alignment = { horizontal: 'center', vertical: 'middle' };
    boxHeader.border = allBorders;
    ws.getCell(boxStartRow, 5).border = allBorders;

    // Итого план
    const r1 = ws.getRow(boxStartRow + 1);
    r1.getCell(4).value = 'Итого план';
    r1.getCell(4).border = allBorders;
    r1.getCell(5).value = totalPlan;
    r1.getCell(5).border = allBorders;
    r1.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    // Итого факт
    const r2 = ws.getRow(boxStartRow + 2);
    r2.getCell(4).value = 'Итого факт';
    r2.getCell(4).border = allBorders;
    r2.getCell(5).value = totalFact;
    r2.getCell(5).border = allBorders;
    r2.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    // % исполнения
    const r3 = ws.getRow(boxStartRow + 3);
    r3.getCell(4).value = '% исполнения';
    r3.getCell(4).border = allBorders;
    r3.getCell(5).value = `${totalPercent}%`;
    r3.getCell(5).border = allBorders;
    r3.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

    const widths = [11, 24, 32, 11, 8, 8, 14, 20, 6];
    for (let i = 0; i < totalColumns; i++) {
      ws.getColumn(i + 1).width = widths[i] ?? 15;
    }

    const buffer = await wb.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
