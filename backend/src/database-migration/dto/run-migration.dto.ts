import { IsString, IsArray, IsOptional, IsBoolean, IsNumber, MinLength } from 'class-validator';

export class ColumnMappingDto {
  @IsString()
  @MinLength(1)
  sourceColumn: string;

  @IsString()
  @MinLength(1)
  destColumn: string;

  @IsString()
  sourceType: string;
}

export class DiscoverColumnsDto {
  @IsString()
  connectionId: string;

  @IsString()
  @MinLength(1)
  tableName: string;
}

export class PreviewRowsDto {
  @IsString()
  sourceConnectionId: string;

  @IsString()
  @MinLength(1)
  sourceTable: string;

  @IsArray()
  columnMappings: ColumnMappingDto[];

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class RunMigrationDto {
  @IsString()
  sourceConnectionId: string;

  @IsString()
  destConnectionId: string;

  @IsString()
  @MinLength(1)
  sourceTable: string;

  @IsString()
  @MinLength(1)
  destTable: string;

  @IsArray()
  columnMappings: ColumnMappingDto[];

  @IsOptional()
  @IsBoolean()
  dropExisting?: boolean;

  @IsOptional()
  @IsNumber()
  batchSize?: number;

  @IsOptional()
  @IsBoolean()
  createTable?: boolean;
}
