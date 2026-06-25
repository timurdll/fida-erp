import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBsuDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  companyIds?: number[];

  @IsOptional()
  @IsString()
  address?: string;
}
