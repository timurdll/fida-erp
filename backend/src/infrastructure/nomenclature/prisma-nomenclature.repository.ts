import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { INomenclatureRepository, NomenclatureFilters } from '../../domain/nomenclature/i-nomenclature.repository';
import { NomenclatureEntity } from '../../domain/nomenclature/nomenclature.entity';
import { CreateNomenclatureDto } from '../../application/nomenclature/dto/create-nomenclature.dto';
import { UpdateNomenclatureDto } from '../../application/nomenclature/dto/update-nomenclature.dto';

@Injectable()
export class PrismaNomenclatureRepository implements INomenclatureRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): NomenclatureEntity {
    return {
      id: r.id,
      name: r.name,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(filters: NomenclatureFilters): Promise<NomenclatureEntity[]> {
    const rows = await this.prisma.nomenclature.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async findById(id: number): Promise<NomenclatureEntity | null> {
    const r = await this.prisma.nomenclature.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateNomenclatureDto): Promise<NomenclatureEntity> {
    return this.map(await this.prisma.nomenclature.create({ data }));
  }

  async update(id: number, data: UpdateNomenclatureDto): Promise<NomenclatureEntity> {
    return this.map(await this.prisma.nomenclature.update({ where: { id }, data }));
  }

  async deactivate(id: number): Promise<NomenclatureEntity> {
    return this.map(await this.prisma.nomenclature.update({ where: { id }, data: { isActive: false } }));
  }
}
