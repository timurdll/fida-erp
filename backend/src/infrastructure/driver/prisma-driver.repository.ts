import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IDriverRepository, DriverFilters } from '../../domain/driver/i-driver.repository';
import { DriverEntity } from '../../domain/driver/driver.entity';
import { CreateDriverDto } from '../../application/driver/dto/create-driver.dto';
import { UpdateDriverDto } from '../../application/driver/dto/update-driver.dto';

@Injectable()
export class PrismaDriverRepository implements IDriverRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): DriverEntity {
    return { id: r.id, fullName: r.fullName, isActive: r.isActive, createdAt: r.createdAt, updatedAt: r.updatedAt };
  }

  async findAll(filters: DriverFilters): Promise<DriverEntity[]> {
    const rows = await this.prisma.driver.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { fullName: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { fullName: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<DriverEntity | null> {
    const r = await this.prisma.driver.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateDriverDto): Promise<DriverEntity> {
    return this.map(await this.prisma.driver.create({ data }));
  }

  async update(id: number, data: UpdateDriverDto): Promise<DriverEntity> {
    return this.map(await this.prisma.driver.update({ where: { id }, data }));
  }

  async activate(id: number) {
    const r = await this.prisma.driver.update({ where: { id }, data: { isActive: true } });
    return this.map(r);
  }

  async deactivate(id: number): Promise<DriverEntity> {
    return this.map(await this.prisma.driver.update({ where: { id }, data: { isActive: false } }));
  }
}
