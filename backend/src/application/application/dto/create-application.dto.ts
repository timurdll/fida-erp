import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class CreateApplicationDto {
  @IsInt()
  supplierId: number;

  @IsInt()
  customerId: number;

  @IsInt()
  objectId: number;

  @IsInt()
  materialId: number;

  @IsOptional()
  @IsInt()
  constructionId?: number;

  @IsOptional()
  @IsInt()
  deliveryMethodId?: number;

  @IsNumber()
  @Min(0.01)
  targetVolume: number;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'deliveryDate must be in YYYY-MM-DD format' })
  deliveryDate: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'deliveryTime must be in HH:mm format' })
  deliveryTime: string;

  @IsInt()
  @Min(1)
  loadingInterval: number;

  @IsOptional()
  @IsNumber()
  slumpCone?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
