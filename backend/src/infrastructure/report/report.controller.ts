import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ReportService } from '../../application/report/report.service';
import { ReportQueryDto } from '../../application/report/dto/report-query.dto';
import { ReportExcelBuilder } from './report-excel.builder';
import { REPORT_TYPES, ReportType } from '../../domain/report/report.types';
import type { ReportResult } from '../../domain/report/report.types';
import type { ReportFilters } from '../../domain/report/i-report.repository';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(
    private readonly service: ReportService,
    private readonly excel: ReportExcelBuilder,
  ) {}

  @Get(':type')
  async export(
    @Param('type') type: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | ReportResult> {
    if (!REPORT_TYPES.includes(type as ReportType)) {
      throw new BadRequestException(`Неизвестный тип отчёта: ${type}`);
    }
    const reportType = type as ReportType;

    // ВАЖНО (таймзона): query.dateFrom/dateTo приходят как ISO datetime БЕЗ offset
    // (напр. "2026-06-01T00:00:00"). `new Date(...)` интерпретирует такую строку в
    // ЛОКАЛЬНОЙ таймзоне процесса Node (зависит от env TZ). Фильтр firstWeighingAt тоже
    // сравнивается в этой зоне. Чтобы выборка совпадала с ожиданиями пользователя, сервер
    // должен работать в TZ=Asia/Aqtobe (или фронт обязан слать дату с явным offset).
    // См. отчёт о верификации — факт зафиксирован, фикс вне этого плана.
    const dateFrom = new Date(query.dateFrom);
    const dateTo = new Date(query.dateTo);
    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Некорректные даты dateFrom/dateTo');
    }

    const filters: ReportFilters = {
      dateFrom,
      dateTo,
      supplierIds: query.supplierIds,
      customerIds: query.customerIds,
      materialId: query.materialId,
      carrierIds: query.carrierIds,
      objectIds: query.objectIds,
      supplierType: query.supplierType,
      customerType: query.customerType,
    };

    const result = await this.service.build(reportType, filters);

    // format=json → отдаём нейтральный ReportResult как JSON (превью на фронте).
    // Nest сериализует объект сам (passthrough). null-ячейки в cells[] остаются null.
    if (query.format === 'json') {
      return result;
    }

    const buffer = await this.excel.build(result);

    const filename = `${reportType}_${query.dateFrom.slice(0, 10)}_${query.dateTo.slice(0, 10)}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }
}
