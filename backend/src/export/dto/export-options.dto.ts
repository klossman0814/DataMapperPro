import { IsOptional, IsString, IsBoolean, IsArray, IsObject } from 'class-validator';

export class ExportOptionsDto {
  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsString()
  delimiter?: string;

  @IsOptional()
  @IsString()
  lineEnding?: string;

  @IsOptional()
  @IsString()
  encoding?: string;

  @IsOptional()
  @IsArray()
  fixedWidthConfig?: { field: string; width: number; align?: string; padChar?: string }[];

  @IsOptional()
  @IsString()
  xmlRoot?: string;

  @IsOptional()
  @IsString()
  xmlItem?: string;

  @IsOptional()
  @IsBoolean()
  includeHeaders?: boolean;

  @IsOptional()
  @IsBoolean()
  jsonLines?: boolean;

  @IsOptional()
  @IsArray()
  columns?: string[];
}
