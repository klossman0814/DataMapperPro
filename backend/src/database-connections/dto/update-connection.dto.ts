import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class UpdateConnectionDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() host?: string;
  @IsOptional() @IsInt() port?: number;
  @IsOptional() @IsString() databaseName?: string;
  @IsOptional() @IsString() username?: string;
  @IsOptional() @IsString() password?: string;
  @IsOptional() @IsBoolean() sslEnabled?: boolean;
}

