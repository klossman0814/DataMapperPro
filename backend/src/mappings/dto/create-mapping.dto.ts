import { IsString, IsOptional, IsArray, IsUUID, IsObject } from 'class-validator';

export class CreateMappingDto {
  @IsUUID()
  profileId: string;

  @IsArray()
  mappings: Record<string, any>[];

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  template: string;
}
