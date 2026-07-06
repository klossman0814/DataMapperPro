import { IsOptional, IsString, IsEmail, IsIn, IsArray } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['ADMIN', 'SUPERUSER', 'USER'])
  role?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  menuPermissions?: string[];
}
