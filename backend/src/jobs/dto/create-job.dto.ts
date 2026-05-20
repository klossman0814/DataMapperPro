import { IsString, IsOptional, IsUUID, IsObject, IsArray } from 'class-validator';

export class CreateJobDto {
  @IsUUID()
  fileId: string;

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
  outputOptions?: {
    delimiter?: string;
    lineEnding?: string;
    encoding?: string;
    fixedWidthConfig?: { field: string; width: number; align: string; padChar: string }[];
  };
}