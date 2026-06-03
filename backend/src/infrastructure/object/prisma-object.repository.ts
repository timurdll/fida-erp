import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IObjectRepository, ObjectFilters } from '../../domain/object/i-object.repository';
import { ObjectEntity } from '../../domain/object/object.entity';
import { CreateObjectDto } from '../../application/object/dto/create-object.dto';
import { UpdateObjectDto } from '../../application/object/dto/update-object.dto';

const INCLUDE = { company: { select: { id: true, name: true } } } as const;

@Injectable()
export class PrismaObjectRepository implements IObjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): ObjectEntity {
    return {
      id: r.id,
      name: r.name,
      companyId: r.companyId,
      company: r.company ?? null,
      address: r.address,
      receiverPhone: r.receiverPhone,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(filters: ObjectFilters): Promise<ObjectEntity[]> {
    const rows = await this.prisma.object.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
        ...(filters.companyId && { companyId: filters.companyId }),
      },
      include: INCLUDE,
      orderBy: { name: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<ObjectEntity | null> {
    const r = await this.prisma.object.findUnique({ where: { id }, include: INCLUDE });
    return r ? this.map(r) : null;
  }

  async create(data: CreateObjectDto): Promise<ObjectEntity> {
    return this.map(await this.prisma.object.create({ data, include: INCLUDE }));
  }

  async update(id: number, data: UpdateObjectDto): Promise<ObjectEntity> {
    return this.map(await this.prisma.object.update({ where: { id }, data, include: INCLUDE }));
  }

  async activate(id: number) {
    return this.map(await this.prisma.object.update({ where: { id }, data: { isActive: true }, include: INCLUDE }));
  }

  async deactivate(id: number): Promise<ObjectEntity> {
    return this.map(await this.prisma.object.update({ where: { id }, data: { isActive: false }, include: INCLUDE }));
  }
}
