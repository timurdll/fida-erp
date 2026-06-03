import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IDeliveryMethodRepository, DeliveryMethodFilters } from '../../domain/delivery-method/i-delivery-method.repository';
import { DeliveryMethodEntity } from '../../domain/delivery-method/delivery-method.entity';
import { CreateDeliveryMethodDto } from '../../application/delivery-method/dto/create-delivery-method.dto';
import { UpdateDeliveryMethodDto } from '../../application/delivery-method/dto/update-delivery-method.dto';

@Injectable()
export class PrismaDeliveryMethodRepository implements IDeliveryMethodRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): DeliveryMethodEntity {
    return { id: r.id, name: r.name, type: r.type, note: r.note, isActive: r.isActive, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }

  async findAll(filters: DeliveryMethodFilters): Promise<DeliveryMethodEntity[]> {
    const rows = await this.prisma.deliveryMethod.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<DeliveryMethodEntity | null> {
    const r = await this.prisma.deliveryMethod.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateDeliveryMethodDto): Promise<DeliveryMethodEntity> {
    return this.map(await this.prisma.deliveryMethod.create({ data }));
  }

  async update(id: number, data: UpdateDeliveryMethodDto): Promise<DeliveryMethodEntity> {
    return this.map(await this.prisma.deliveryMethod.update({ where: { id }, data }));
  }

  async activate(id: number) {
    const r = await this.prisma.deliveryMethod.update({ where: { id }, data: { isActive: true } });
    return this.map(r);
  }

  async deactivate(id: number): Promise<DeliveryMethodEntity> {
    return this.map(await this.prisma.deliveryMethod.update({ where: { id }, data: { isActive: false } }));
  }
}
