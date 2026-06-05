import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IApplicationRepository, ApplicationFilters } from '../../domain/application/i-application.repository';
import {
  ApplicationEntity,
  ApplicationProgress,
  ApplicationStatus,
  PlumbLogSummary,
} from '../../domain/application/application.entity';
import { CreateApplicationDto } from '../../application/application/dto/create-application.dto';
import { UpdateApplicationDto } from '../../application/application/dto/update-application.dto';

const PLUMB_SELECT = {
  id: true,
  tare: true,
  gross: true,
  net: true,
  volume: true,
  bsuNumber: true,
  firstWeighingAt: true,
  secondWeighingAt: true,
  isReturn: true,
  isActive: true,
  transport: { select: { id: true, plateNumber: true } },
  driver: { select: { id: true, fullName: true } },
} as const;

const INCLUDE = {
  supplier: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  object: { select: { id: true, name: true, address: true } },
  material: { select: { id: true, name: true, type: true } },
  construction: { select: { id: true, name: true } },
  deliveryMethod: { select: { id: true, name: true } },
  author: { select: { id: true, fullName: true } },
  plumbLogs: {
    where: { isActive: true, isReturn: false },
    select: PLUMB_SELECT,
  },
} as const;

@Injectable()
export class PrismaApplicationRepository implements IApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  private calcProgress(plumbs: any[], targetVolume: number): ApplicationProgress {
    const shippedVolume = plumbs
      .filter((p) => p.gross !== null)
      .reduce((s, p) => s + (p.volume ?? 0), 0);
    const loadingVolume = plumbs
      .filter((p) => p.gross === null)
      .reduce((s, p) => s + (p.volume ?? 0), 0);
    return {
      shippedVolume,
      loadingVolume,
      remainVolume: targetVolume - shippedVolume - loadingVolume,
      totalPlumbs: plumbs.length,
    };
  }

  private map(r: any, includePlumbs = false): ApplicationEntity {
    const plumbs: PlumbLogSummary[] = r.plumbLogs ?? [];
    const entity: ApplicationEntity = {
      id: r.id,
      supplierId: r.supplierId,
      supplier: r.supplier,
      customerId: r.customerId,
      customer: r.customer,
      objectId: r.objectId,
      object: r.object,
      materialId: r.materialId,
      material: r.material,
      constructionId: r.constructionId,
      construction: r.construction,
      deliveryMethodId: r.deliveryMethodId,
      deliveryMethod: r.deliveryMethod,
      authorId: r.authorId,
      author: r.author,
      targetVolume: r.targetVolume,
      deliveryDate: r.deliveryDate,
      deliveryTime: r.deliveryTime,
      loadingInterval: r.loadingInterval,
      slumpCone: r.slumpCone,
      note: r.note,
      status: r.status as ApplicationStatus,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      progress: this.calcProgress(plumbs, r.targetVolume),
    };
    if (includePlumbs) {
      entity.plumbLogs = plumbs;
    }
    return entity;
  }

  private buildDateRange(deliveryDate?: string) {
    if (deliveryDate) {
      const d = new Date(deliveryDate);
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      return { gte: d, lt: next };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return { gte: today, lt: tomorrow };
  }

  async findAll(filters: ApplicationFilters): Promise<ApplicationEntity[]> {
    const where: any = {
      deliveryDate: this.buildDateRange(filters.deliveryDate),
    };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    else where.isActive = true;
    if (filters.status) where.status = filters.status;
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.materialId) where.materialId = filters.materialId;

    const rows = await this.prisma.application.findMany({
      where,
      include: INCLUDE,
      orderBy: [{ deliveryTime: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.map(r, false));
  }

  async findById(id: number): Promise<ApplicationEntity | null> {
    const r = await this.prisma.application.findUnique({
      where: { id },
      include: INCLUDE,
    });
    return r ? this.map(r, true) : null;
  }

  async create(
    data: CreateApplicationDto & { authorId: number },
  ): Promise<ApplicationEntity> {
    const { deliveryDate, authorId, supplierId, customerId, objectId, materialId,
      constructionId, deliveryMethodId, targetVolume, deliveryTime, loadingInterval,
      slumpCone, note } = data;

    const r = await this.prisma.application.create({
      data: {
        supplier: { connect: { id: supplierId } },
        customer: { connect: { id: customerId } },
        object: { connect: { id: objectId } },
        material: { connect: { id: materialId } },
        author: { connect: { id: authorId } },
        ...(constructionId ? { construction: { connect: { id: constructionId } } } : {}),
        ...(deliveryMethodId ? { deliveryMethod: { connect: { id: deliveryMethodId } } } : {}),
        targetVolume,
        deliveryDate: new Date(deliveryDate),
        deliveryTime,
        loadingInterval,
        slumpCone,
        note,
      },
      include: INCLUDE,
    });
    return this.map(r, false);
  }

  async update(id: number, data: UpdateApplicationDto): Promise<ApplicationEntity> {
    const { deliveryDate, supplierId, customerId, objectId, materialId,
      constructionId, deliveryMethodId, ...rest } = data as any;

    const r = await this.prisma.application.update({
      where: { id },
      data: {
        ...rest,
        ...(deliveryDate ? { deliveryDate: new Date(deliveryDate) } : {}),
        ...(supplierId ? { supplier: { connect: { id: supplierId } } } : {}),
        ...(customerId ? { customer: { connect: { id: customerId } } } : {}),
        ...(objectId ? { object: { connect: { id: objectId } } } : {}),
        ...(materialId ? { material: { connect: { id: materialId } } } : {}),
        ...(constructionId !== undefined
          ? constructionId
            ? { construction: { connect: { id: constructionId } } }
            : { construction: { disconnect: true } }
          : {}),
        ...(deliveryMethodId !== undefined
          ? deliveryMethodId
            ? { deliveryMethod: { connect: { id: deliveryMethodId } } }
            : { deliveryMethod: { disconnect: true } }
          : {}),
      },
      include: INCLUDE,
    });
    return this.map(r, false);
  }

  async complete(id: number): Promise<ApplicationEntity> {
    const r = await this.prisma.application.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: INCLUDE,
    });
    return this.map(r, false);
  }

  async deactivate(id: number): Promise<ApplicationEntity> {
    const r = await this.prisma.application.update({
      where: { id },
      data: { isActive: false, status: 'CANCELLED' },
      include: INCLUDE,
    });
    return this.map(r, false);
  }
}
