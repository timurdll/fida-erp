import { IsInt, Min } from 'class-validator';

export class WeighDto {
  @IsInt()
  @Min(0)
  weight: number;
}
