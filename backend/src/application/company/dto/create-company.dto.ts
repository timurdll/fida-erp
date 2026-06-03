import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CompanyFunction, CompanyType } from '@prisma/client';

export class CreateCompanyDto {
  @IsString()
  name: string;

  @IsEnum(CompanyFunction)
  function: CompanyFunction;

  @IsEnum(CompanyType)
  type: CompanyType;

  @IsOptional()
  @IsString()
  bin?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;
}
