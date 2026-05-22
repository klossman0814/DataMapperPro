import { IsString, IsOptional, IsUUID, IsObject, IsArray } from 'class-validator';

export class CreateJobDto {
  @IsOptional()
  @IsUUID()
  fileId?: string;

  @IsOptional()
  @IsUUID()
  databaseConnectionId?: string;

  @IsOptional()
  @IsString()
  querySql?: string;

  @IsOptional()
  @IsUUID()
  profileId?: string;

  @IsString()
  outputFormat: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsArray()
  mappings?: Record<string, any>[];

  @IsOptional()
  @IsObject()
  outputOptions?: Record<string, any>;
}
