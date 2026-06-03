import { IsOptional, IsString } from 'class-validator';

export class CreateCarrierDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  note?: string;
}
