import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  IReportRepository,
  ReportApplicationRow,
  ReportFilters,
  ReportPlumbRow,
} from '../../domain/report/i-report.repository';

const SELECT = {
  id: true,
  net: true,
  gross: true,
  tare: true,
  volume: true,
  note: true,
  firstWeighingAt: true,
  secondWeighingAt: true,
  supplierId: true,
  customerId: true,
  materialId: true,
  carrierId: true,
  objectId: true,
  supplier: { select: { name: true } },
  customer: { select: { name: true } },
  material: { select: { name: true } },
  object: { select: { name: true } },
  transport: { select: { plateNumber: true } },
  carrier: { select: { name: true } },
  nomenclature: { select: { name: true } },
  firstOperator: { select: { fullName: true } },
  secondOperator: { select: { fullName: true } },
} as const;

const APPLICATION_SELECT = {
  id: true,
  targetVolume: true,
  deliveryDate: true,
  deliveryTime: true,
  note: true,
  supplierId: true,
  customerId: true,
  materialId: true,
  objectId: true,
  supplier: { select: { name: true } },
  customer: { select: { name: true } },
  material: { select: { name: true } },
  object: { select: { name: true } },
  plumbLogs: {
    where: { isActive: true, isReturn: false },
    select: {
      volume: true,
      gross: true,
    },
  },
} as const;

@Injectable()
export class PrismaReportRepository implements IReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): ReportPlumbRow {
    const net = r.net ?? (r.gross != null && r.tare != null ? r.gross - r.tare : null);
    return {
      id: r.id,
      net,
      gross: r.gross,
      tare: r.tare,
      volume: r.volume,
      note: r.note,
      firstWeighingAt: r.firstWeighingAt,
      secondWeighingAt: r.secondWeighingAt,
      supplierName: r.supplier?.name ?? null,
      customerName: r.customer?.name ?? null,
      materialName: r.material?.name ?? null,
      objectName: r.object?.name ?? null,
      plateNumber: r.transport?.plateNumber ?? null,
      carrierName: r.carrier?.name ?? null,
      nomenclatureName: r.nomenclature?.name ?? null,
      operatorName:
        r.secondOperator?.fullName ?? r.firstOperator?.fullName ?? null,
      supplierId: r.supplierId,
      customerId: r.customerId,
      materialId: r.materialId,
      carrierId: r.carrierId,
      objectId: r.objectId,
    };
  }

  private mapApplication(r: any): ReportApplicationRow {
    return {
      id: r.id,
      targetVolume: r.targetVolume,
      deliveryDate: r.deliveryDate,
      deliveryTime: r.deliveryTime,
      note: r.note,
      supplierId: r.supplierId,
      customerId: r.customerId,
      materialId: r.materialId,
      objectId: r.objectId,
      supplierName: r.supplier?.name ?? null,
      customerName: r.customer?.name ?? null,
      materialName: r.material?.name ?? null,
      objectName: r.object?.name ?? null,
      plumbLogs: r.plumbLogs ?? [],
    };
  }

  /** Диапазон дат — полный datetime BETWEEN включительно (см. п.3 спеки, НЕ date-only). */
  private dateWhere(f: ReportFilters) {
    return { gte: f.dateFrom, lte: f.dateTo };
  }

  /** Опциональные фильтры, общие для всех отчётов (применяются, только если заданы). */
  private optionalWhere(f: ReportFilters): Record<string, unknown> {
    const w: Record<string, unknown> = {};
    if (f.supplierId !== undefined) w.supplierId = f.supplierId;
    if (f.customerId !== undefined) w.customerId = f.customerId;
    if (f.materialId !== undefined) w.materialId = f.materialId;
    if (f.carrierId !== undefined) w.carrierId = f.carrierId;
    if (f.objectId !== undefined) w.objectId = f.objectId;
    if (f.supplierType !== undefined) w.supplier = { type: f.supplierType as any };
    if (f.customerType !== undefined) w.customer = { type: f.customerType as any };
    return w;
  }

  private async query(where: Record<string, unknown>): Promise<ReportPlumbRow[]> {
    const rows = await this.prisma.plumbLog.findMany({
      where,
      select: SELECT,
      orderBy: { firstWeighingAt: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  findIndependentActive(f: ReportFilters): Promise<ReportPlumbRow[]> {
    return this.query({
      applicationId: null,
      isActive: true,
      isReturn: false,
      firstWeighingAt: this.dateWhere(f),
      ...this.optionalWhere(f),
    });
  }

  findIndependentDeleted(f: ReportFilters): Promise<ReportPlumbRow[]> {
    return this.query({
      applicationId: null,
      isActive: false,
      firstWeighingAt: this.dateWhere(f),
      ...this.optionalWhere(f),
    });
  }

  findDependentActive(f: ReportFilters): Promise<ReportPlumbRow[]> {
    return this.query({
      applicationId: { not: null },
      isActive: true,
      isReturn: false,
      firstWeighingAt: this.dateWhere(f),
      ...this.optionalWhere(f),
    });
  }

  findDependentDeleted(f: ReportFilters): Promise<ReportPlumbRow[]> {
    return this.query({
      applicationId: { not: null },
      isActive: false,
      firstWeighingAt: this.dateWhere(f),
      ...this.optionalWhere(f),
    });
  }

  findReturns(f: ReportFilters): Promise<ReportPlumbRow[]> {
    return this.query({
      isReturn: true,
      firstWeighingAt: this.dateWhere(f),
      ...this.optionalWhere(f),
    });
  }

  async findApplications(f: ReportFilters): Promise<ReportApplicationRow[]> {
    const rows = await this.prisma.application.findMany({
      where: {
        isActive: true,
        deliveryDate: this.dateWhere(f),
        ...this.optionalWhere(f),
      },
      select: APPLICATION_SELECT,
      orderBy: [
        { deliveryDate: 'asc' },
        { deliveryTime: 'asc' },
        { createdAt: 'asc' },
      ],
    });
    return rows.map((r) => this.mapApplication(r));
  }
}
