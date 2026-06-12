import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IBsuRepository, BsuFilters } from '../../domain/bsu/i-bsu.repository';
import { BsuEntity } from '../../domain/bsu/bsu.entity';
import { CreateBsuDto } from '../../application/bsu/dto/create-bsu.dto';
import { UpdateBsuDto } from '../../application/bsu/dto/update-bsu.dto';

const INCLUDE = {
  company: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaBsuRepository implements IBsuRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): BsuEntity {
    return {
      id: r.id,
      name: r.name,
      address: r.address,
      companyId: r.companyId,
      company: r.company,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(filters: BsuFilters): Promise<BsuEntity[]> {
    const rows = await this.prisma.bsu.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
        ...(filters.companyId !== undefined && { companyId: filters.companyId }),
      },
      include: INCLUDE,
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: number): Promise<BsuEntity | null> {
    const r = await this.prisma.bsu.findUnique({ where: { id }, include: INCLUDE });
    return r ? this.map(r) : null;
  }

  async create(data: CreateBsuDto): Promise<BsuEntity> {
    const r = await this.prisma.bsu.create({ data, include: INCLUDE });
    return this.map(r);
  }

  async update(id: number, data: UpdateBsuDto): Promise<BsuEntity> {
    const r = await this.prisma.bsu.update({ where: { id }, data, include: INCLUDE });
    return this.map(r);
  }

  async deactivate(id: number): Promise<BsuEntity> {
    const r = await this.prisma.bsu.update({ where: { id }, data: { isActive: false }, include: INCLUDE });
    return this.map(r);
  }
}
