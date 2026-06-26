import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlumbLogDto {
  @IsInt()
  supplierId: number;

  @IsInt()
  customerId: number;

  @IsInt()
  materialId: number;

  @IsInt()
  transportId: number;

  @IsOptional()
  @IsInt()
  objectId?: number;

  @IsOptional()
  @IsInt()
  driverId?: number;

  @IsOptional()
  @IsInt()
  carrierId?: number;

  @IsOptional()
  @IsInt()
  applicationId?: number;

  @IsOptional()
  @IsInt()
  bsuId?: number;

  @IsOptional()
  @IsInt()
  constructionId?: number;

  @IsOptional()
  @IsNumber()
  volume?: number;

  @IsOptional()
  @IsNumber()
  returnVolume?: number;

  @IsOptional()
  @IsString()
  sealNumber?: string;

  @IsOptional()
  @IsString()
  slumpCone?: string;

  @IsOptional()
  @IsString()
  deliveryType?: string;

  @IsOptional()
  @IsInt()
  nomenclatureId?: number;

  @IsOptional()
  @IsNumber()
  impurity?: number;

  @IsOptional()
  @IsInt()
  cleanNet?: number;

  @IsOptional()
  @IsInt()
  documentWeight?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tare?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  gross?: number;
}
