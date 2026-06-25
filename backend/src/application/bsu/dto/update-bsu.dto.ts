import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateBsuDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  companyIds?: number[];

  @IsOptional()
  @IsString()
  address?: string;
}
