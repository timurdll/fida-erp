import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ICompanyRepository, CompanyFilters } from '../../domain/company/i-company.repository';
import { CompanyEntity, CompanyFunction, CompanyType } from '../../domain/company/company.entity';
import { CreateCompanyDto } from '../../application/company/dto/create-company.dto';
import { UpdateCompanyDto } from '../../application/company/dto/update-company.dto';

@Injectable()
export class PrismaCompanyRepository implements ICompanyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private map(r: any): CompanyEntity {
    return {
      id: r.id,
      name: r.name,
      function: r.function as CompanyFunction,
      bin: r.bin,
      type: r.type as CompanyType,
      contactPhone: r.contactPhone,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }

  async findAll(filters: CompanyFilters): Promise<CompanyEntity[]> {
    const rows = await this.prisma.company.findMany({
      where: {
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && { name: { contains: filters.search, mode: 'insensitive' } }),
      },
      orderBy: { name: 'asc' },
    });
    return rows.map(this.map);
  }

  async findById(id: number): Promise<CompanyEntity | null> {
    const r = await this.prisma.company.findUnique({ where: { id } });
    return r ? this.map(r) : null;
  }

  async create(data: CreateCompanyDto): Promise<CompanyEntity> {
    return this.map(await this.prisma.company.create({ data }));
  }

  async update(id: number, data: UpdateCompanyDto): Promise<CompanyEntity> {
    return this.map(await this.prisma.company.update({ where: { id }, data }));
  }

  async activate(id: number) {
    const r = await this.prisma.company.update({ where: { id }, data: { isActive: true } });
    return this.map(r);
  }

  async deactivate(id: number): Promise<CompanyEntity> {
    return this.map(await this.prisma.company.update({ where: { id }, data: { isActive: false } }));
  }
}
