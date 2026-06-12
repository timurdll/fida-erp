import { IsString } from 'class-validator';

export class CreateNomenclatureDto {
  @IsString()
  name: string;
}
