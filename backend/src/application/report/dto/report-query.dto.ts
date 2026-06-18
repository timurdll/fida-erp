import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional } from 'class-validator';
import { CompanyType } from '../../../domain/company/company.entity';

export class ReportQueryDto {
  // Полный ISO datetime (НЕ date-only): фильтр firstWeighingAt BETWEEN dateFrom..dateTo
  @IsISO8601()
  dateFrom: string;

  @IsISO8601()
  dateTo: string;

  // Формат ответа: 'xlsx' (файл, дефолт) | 'json' (превью ReportResult)
  @IsOptional()
  @IsIn(['xlsx', 'json'])
  format?: 'xlsx' | 'json';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  supplierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  customerId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  materialId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  carrierId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  objectId?: number;

  @IsOptional()
  @IsEnum(CompanyType)
  supplierType?: CompanyType;

  @IsOptional()
  @IsEnum(CompanyType)
  customerType?: CompanyType;
}
