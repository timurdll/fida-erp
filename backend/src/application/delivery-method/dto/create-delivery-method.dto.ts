import { IsOptional, IsString } from 'class-validator';

export class CreateDeliveryMethodDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
