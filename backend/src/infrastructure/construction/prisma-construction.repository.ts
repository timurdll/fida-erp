import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IConstructionRepository, ConstructionFilters } from '../../domain/construction/i-construction.repository';
import { ConstructionEntity } from '../../domain/construction/construction.entity';
import { CreateConstructionDto } from '../../application/construction/dto/create-construction.dto';
import { UpdateConstructionDto } from '../../application/construction/dto/update-construction.dto';

@Injectable()
export class PrismaConstructionRepository implements IConstructionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): ConstructionEntity {
    return { id: r.id, name: r.name, type: r.type, note: r.note, isActive: r.isActive, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }

  async findAll(filters: ConstructionFilters): Promise<ConstructionEntity[]> {
    const rows = await this.prisma.construction.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<ConstructionEntity | null> {
    const r = await this.prisma.construction.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateConstructionDto): Promise<ConstructionEntity> {
    return this.map(await this.prisma.construction.create({ data }));
  }

  async update(id: number, data: UpdateConstructionDto): Promise<ConstructionEntity> {
    return this.map(await this.prisma.construction.update({ where: { id }, data }));
  }

  async deactivate(id: number): Promise<ConstructionEntity> {
    return this.map(await this.prisma.construction.update({ where: { id }, data: { isActive: false } }));
  }
}
