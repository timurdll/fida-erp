import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateObjectDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(1)
  companyId: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;
}
