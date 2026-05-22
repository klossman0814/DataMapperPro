import { IsString, IsArray, IsOptional, IsBoolean, IsNumber, IsObject } from 'class-validator';

export class ImportTableDto {
  @IsString()
  connectionId: string;

  @IsString()
  tableName: string;

  @IsArray()
  @IsObject({ each: true })
  columns: { name: string; type: string; sampleValues?: any[] }[];

  @IsArray()
  @IsObject({ each: true })
  rows: Record<string, any>[];

  @IsOptional()
  @IsBoolean()
  dropExisting?: boolean = true;

  @IsOptional()
  @IsNumber()
  batchSize?: number = 100;
}
