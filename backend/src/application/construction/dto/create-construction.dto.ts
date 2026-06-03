import { IsOptional, IsString } from 'class-validator';

export class CreateConstructionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
