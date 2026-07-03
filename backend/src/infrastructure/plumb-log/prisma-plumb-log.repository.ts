import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IPlumbLogRepository, PlumbLogFilters } from '../../domain/plumb-log/i-plumb-log.repository';
import { PlumbLogEntity } from '../../domain/plumb-log/plumb-log.entity';
import { CreatePlumbLogDto } from '../../application/plumb-log/dto/create-plumb-log.dto';
import { UpdatePlumbLogDto } from '../../application/plumb-log/dto/update-plumb-log.dto';

const INCLUDE = {
  supplier:       { select: { id: true, name: true } },
  customer:       { select: { id: true, name: true } },
  material:       { select: { id: true, name: true, type: true } },
  object:         { select: { id: true, name: true } },
  transport:      { select: { id: true, plateNumber: true, tare: true } },
  driver:         { select: { id: true, fullName: true } },
  carrier:        { select: { id: true, name: true } },
  construction:   { select: { id: true, name: true } },
  bsu:            { select: { id: true, name: true } },
  nomenclature:   { select: { id: true, name: true } },
  firstOperator:  { select: { id: true, fullName: true } },
  secondOperator: { select: { id: true, fullName: true } },
} as const;

@Injectable()
export class PrismaPlumbLogRepository implements IPlumbLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(raw: any): PlumbLogEntity {
    return {
      ...raw,
      net: raw.gross != null && raw.tare != null ? raw.gross - raw.tare : null,
    };
  }

  async findAll(filters: PlumbLogFilters): Promise<PlumbLogEntity[]> {
    const where: any = {};

    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.isReturn !== undefined) where.isReturn = filters.isReturn;
    if (filters.supplierId !== undefined) where.supplierId = filters.supplierId;
    if (filters.customerId !== undefined) where.customerId = filters.customerId;
    if (filters.materialId !== undefined) where.materialId = filters.materialId;
    if (filters.applicationId !== undefined) where.applicationId = filters.applicationId;
    // standalone=true — только отвесы сырья (без привязки к заявке)
    if (filters.standalone === true) where.applicationId = null;

    if (filters.dateFrom || filters.dateTo) {
      where.firstWeighingAt = {};
      if (filters.dateFrom) {
        where.firstWeighingAt.gte = new Date(filters.dateFrom + 'T00:00:00');
      }
      if (filters.dateTo) {
        where.firstWeighingAt.lte = new Date(filters.dateTo + 'T23:59:59');
      }
    } else if (filters.applicationId === undefined) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      where.firstWeighingAt = { gte: today, lt: tomorrow };
    }

    const rows = await this.prisma.plumbLog.findMany({
      where,
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: number): Promise<PlumbLogEntity | null> {
    const r = await this.prisma.plumbLog.findUnique({ where: { id }, include: INCLUDE });
    return r ? this.map(r) : null;
  }

  async create(data: CreatePlumbLogDto & { firstOperatorId: number }): Promise<PlumbLogEntity> {
    const { tare, gross, ...rest } = data;
    const net = gross != null && tare != null ? gross - tare : null;
    const r = await this.prisma.plumbLog.create({
      data: {
        ...rest,
        tare: tare ?? null,
        gross: gross ?? null,
        net,
        firstWeighingAt: new Date(),
      },
      include: INCLUDE,
    });
    return this.map(r);
  }

  async update(id: number, data: UpdatePlumbLogDto): Promise<PlumbLogEntity> {
    const existing = await this.prisma.plumbLog.findUnique({ where: { id } });
    const tare = data.tare ?? existing?.tare ?? null;
    const gross = data.gross ?? existing?.gross ?? null;
    const net = gross != null && tare != null ? gross - tare : null;

    const r = await this.prisma.plumbLog.update({
      where: { id },
      data: { ...data, net },
      include: INCLUDE,
    });
    return this.map(r);
  }

  async weighTare(id: number, tare: number, operatorId: number): Promise<PlumbLogEntity> {
    const existing = await this.prisma.plumbLog.findUnique({ where: { id } });
    const net = existing?.gross != null ? existing.gross - tare : null;
    const r = await this.prisma.plumbLog.update({
      where: { id },
      data: {
        tare,
        net,
        firstWeighingAt: new Date(),
        firstOperatorId: operatorId,
      },
      include: INCLUDE,
    });
    return this.map(r);
  }

  async weighGross(id: number, gross: number, operatorId: number): Promise<PlumbLogEntity> {
    const existing = await this.prisma.plumbLog.findUnique({ where: { id } });
    const net = existing?.tare != null ? gross - existing.tare : null;
    const r = await this.prisma.plumbLog.update({
      where: { id },
      data: {
        gross,
        net,
        secondWeighingAt: new Date(),
        secondOperatorId: operatorId,
      },
      include: INCLUDE,
    });
    return this.map(r);
  }

  async createReturn(originalId: number, operatorId: number): Promise<PlumbLogEntity> {
    const original = await this.prisma.plumbLog.findUnique({ where: { id: originalId } });
    if (!original) throw new Error(`PlumbLog #${originalId} not found`);

    const r = await this.prisma.plumbLog.create({
      data: {
        supplierId:         original.customerId,
        customerId:         original.supplierId,
        materialId:         original.materialId,
        objectId:           original.objectId,
        transportId:        original.transportId,
        driverId:           original.driverId,
        carrierId:          original.carrierId,
        applicationId:      original.applicationId,
        bsuId:              original.bsuId,
        constructionId:     original.constructionId,
        volume:             original.volume,
        isReturn:           true,
        originalPlumbLogId: originalId,
        firstOperatorId:    operatorId,
        firstWeighingAt:    new Date(),
      },
      include: INCLUDE,
    });
    return this.map(r);
  }

  async deactivate(id: number): Promise<PlumbLogEntity> {
    const r = await this.prisma.plumbLog.update({
      where: { id },
      data: { isActive: false },
      include: INCLUDE,
    });
    return this.map(r);
  }
}
