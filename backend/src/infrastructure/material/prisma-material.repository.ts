import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IMaterialRepository, MaterialFilters } from '../../domain/material/i-material.repository';
import { MaterialEntity, MaterialType } from '../../domain/material/material.entity';
import { CreateMaterialDto } from '../../application/material/dto/create-material.dto';
import { UpdateMaterialDto } from '../../application/material/dto/update-material.dto';

@Injectable()
export class PrismaMaterialRepository implements IMaterialRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): MaterialEntity {
    return {
      id: r.id,
      name: r.name,
      type: r.type as MaterialType,
      density: r.density,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(filters: MaterialFilters): Promise<MaterialEntity[]> {
    const rows = await this.prisma.material.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<MaterialEntity | null> {
    const r = await this.prisma.material.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateMaterialDto): Promise<MaterialEntity> {
    const r = await this.prisma.material.create({ data });
    return this.map(r);
  }

  async update(id: number, data: UpdateMaterialDto): Promise<MaterialEntity> {
    const r = await this.prisma.material.update({ where: { id }, data });
    return this.map(r);
  }

  async activate(id: number) {
    const r = await this.prisma.material.update({ where: { id }, data: { isActive: true } });
    return this.map(r);
  }

  async deactivate(id: number): Promise<MaterialEntity> {
    const r = await this.prisma.material.update({ where: { id }, data: { isActive: false } });
    return this.map(r);
  }
}
