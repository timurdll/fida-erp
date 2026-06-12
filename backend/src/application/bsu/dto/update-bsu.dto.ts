import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateBsuDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  address?: string;
}
