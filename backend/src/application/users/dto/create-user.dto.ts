import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '../../../domain/user/user.entity';

export class CreateUserDto {
  @IsString()
  fullName: string;

  @IsString()
  login: string;

  @IsString()
  @MinLength(4)
  password: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  note?: string;
}
