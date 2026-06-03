import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MaterialType } from '@prisma/client';

export class CreateMaterialDto {
  @IsString()
  name: string;

  @IsEnum(MaterialType)
  type: MaterialType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  density?: number;
}
