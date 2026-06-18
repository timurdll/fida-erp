import type { CompanyEntity, CompanyFunction } from './company.entity';
import type { CreateCompanyDto } from '../../application/company/dto/create-company.dto';
import type { UpdateCompanyDto } from '../../application/company/dto/update-company.dto';

export const COMPANY_REPOSITORY = 'COMPANY_REPOSITORY';

export interface CompanyFilters {
  isActive?: boolean;
  search?: string;
  function?: CompanyFunction;
}

export interface ICompanyRepository {
  findAll(filters: CompanyFilters): Promise<CompanyEntity[]>;
  findById(id: number): Promise<CompanyEntity | null>;
  create(data: CreateCompanyDto): Promise<CompanyEntity>;
  update(id: number, data: UpdateCompanyDto): Promise<CompanyEntity>;
  activate(id: number): Promise<CompanyEntity>;
  deactivate(id: number): Promise<CompanyEntity>;
}
