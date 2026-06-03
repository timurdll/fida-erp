import { IsString } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  fullName: string;
}
