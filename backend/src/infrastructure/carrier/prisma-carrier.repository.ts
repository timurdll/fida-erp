import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICarrierRepository, CarrierFilters } from '../../domain/carrier/i-carrier.repository';
import { CarrierEntity } from '../../domain/carrier/carrier.entity';
import { CreateCarrierDto } from '../../application/carrier/dto/create-carrier.dto';
import { UpdateCarrierDto } from '../../application/carrier/dto/update-carrier.dto';

@Injectable()
export class PrismaCarrierRepository implements ICarrierRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): CarrierEntity {
    return { id: r.id, name: r.name, note: r.note, isActive: r.isActive, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }

  async findAll(filters: CarrierFilters): Promise<CarrierEntity[]> {
    const rows = await this.prisma.carrier.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<CarrierEntity | null> {
    const r = await this.prisma.carrier.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateCarrierDto): Promise<CarrierEntity> {
    return this.map(await this.prisma.carrier.create({ data }));
  }

  async update(id: number, data: UpdateCarrierDto): Promise<CarrierEntity> {
    return this.map(await this.prisma.carrier.update({ where: { id }, data }));
  }

  async activate(id: number) {
    const r = await this.prisma.carrier.update({ where: { id }, data: { isActive: true } });
    return this.map(r);
  }

  async deactivate(id: number): Promise<CarrierEntity> {
    return this.map(await this.prisma.carrier.update({ where: { id }, data: { isActive: false } }));
  }
}
