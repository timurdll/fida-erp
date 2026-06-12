import { IsOptional, IsString } from 'class-validator';

export class UpdateNomenclatureDto {
  @IsOptional()
  @IsString()
  name?: string;
}
