import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransportDto {
  @IsString()
  plateNumber: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  driverId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  carrierId?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  tare?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tolerance?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
