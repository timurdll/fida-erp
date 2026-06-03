import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMPANY_REPOSITORY } from '../../domain/company/i-company.repository';
import type { ICompanyRepository, CompanyFilters } from '../../domain/company/i-company.repository';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repo: ICompanyRepository,
  ) {}

  findAll(filters: CompanyFilters = {}) {
    if (filters.isActive === undefined) filters.isActive = true;
    return this.repo.findAll(filters);
  }

  async findById(id: number) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundException(`Компания #${id} не найдена`);
    return item;
  }

  create(dto: CreateCompanyDto) { return this.repo.create(dto); }

  async update(id: number, dto: UpdateCompanyDto) {
    await this.findById(id);
    return this.repo.update(id, dto);
  }

  async deactivate(id: number) {
    await this.findById(id);
    return this.repo.deactivate(id);
  }
}
