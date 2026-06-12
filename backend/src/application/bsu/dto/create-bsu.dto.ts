import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateBsuDto {
  @IsString()
  name: string;

  @IsInt()
  companyId: number;

  @IsOptional()
  @IsString()
  address?: string;
}
