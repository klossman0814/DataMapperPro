import { IsString, IsInt, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  name: string;

  @IsString()
  @IsIn(['mssql', 'postgresql', 'mysql'])
  type: string;

  @IsString()
  host: string;

  @IsInt()
  port: number;

  @IsString()
  databaseName: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  sslEnabled?: boolean;
}
