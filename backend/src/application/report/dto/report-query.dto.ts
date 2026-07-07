import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsIn, IsInt, IsISO8601, IsOptional } from 'class-validator';
import { CompanyType } from '../../../domain/company/company.entity';

function toIntArray({ value }: { value: unknown }): number[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const arr = Array.isArray(value) ? value : [value];
  const nums = arr.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  return nums.length > 0 ? nums : undefined;
}

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
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  supplierIds?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  customerIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  materialId?: number;

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  carrierIds?: number[];

  @IsOptional()
  @Transform(toIntArray)
  @IsArray()
  @IsInt({ each: true })
  objectIds?: number[];

  @IsOptional()
  @IsEnum(CompanyType)
  supplierType?: CompanyType;

  @IsOptional()
  @IsEnum(CompanyType)
  customerType?: CompanyType;
}
