import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ITransportRepository, TransportFilters } from '../../domain/transport/i-transport.repository';
import { TransportEntity } from '../../domain/transport/transport.entity';
import { CreateTransportDto } from '../../application/transport/dto/create-transport.dto';
import { UpdateTransportDto } from '../../application/transport/dto/update-transport.dto';

const INCLUDE = {
  driver: { select: { id: true, fullName: true } },
  carrier: { select: { id: true, name: true } },
} as const;

@Injectable()
export class PrismaTransportRepository implements ITransportRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): TransportEntity {
    return {
      id: r.id,
      plateNumber: r.plateNumber,
      driverId: r.driverId,
      driver: r.driver ?? null,
      carrierId: r.carrierId,
      carrier: r.carrier ?? null,
      tare: r.tare,
      tolerance: r.tolerance,
      note: r.note,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(filters: TransportFilters): Promise<TransportEntity[]> {
    const rows = await this.prisma.transport.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { plateNumber: { contains: filters.search, mode: 'insensitive' } }),
        ...(filters.carrierId && { carrierId: filters.carrierId }),
        ...(filters.driverId && { driverId: filters.driverId }),
      },
      include: INCLUDE,
      orderBy: { plateNumber: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<TransportEntity | null> {
    const r = await this.prisma.transport.findUnique({ where: { id }, include: INCLUDE });
    return r ? this.map(r) : null;
  }

  async create(data: CreateTransportDto): Promise<TransportEntity> {
    const { driverId, carrierId, ...rest } = data;
    return this.map(await this.prisma.transport.create({
      data: {
        ...rest,
        ...(driverId ? { driver: { connect: { id: driverId } } } : {}),
        ...(carrierId ? { carrier: { connect: { id: carrierId } } } : {}),
      } as any,
      include: INCLUDE,
    }));
  }

  async update(id: number, data: UpdateTransportDto): Promise<TransportEntity> {
    const { driverId, carrierId, ...rest } = data as any;
    return this.map(await this.prisma.transport.update({
      where: { id },
      data: {
        ...rest,
        ...(driverId !== undefined ? { driver: driverId ? { connect: { id: driverId } } : { disconnect: true } } : {}),
        ...(carrierId !== undefined ? { carrier: carrierId ? { connect: { id: carrierId } } : { disconnect: true } } : {}),
      },
      include: INCLUDE,
    }));
  }

  async deactivate(id: number): Promise<TransportEntity> {
    return this.map(await this.prisma.transport.update({ where: { id }, data: { isActive: false }, include: INCLUDE }));
  }
}
