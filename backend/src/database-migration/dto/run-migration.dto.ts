import { IsString, IsArray, IsOptional, IsBoolean, IsNumber, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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
  @ValidateNested({ each: true })
  @Type(() => ColumnMappingDto)
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
  @ValidateNested({ each: true })
  @Type(() => ColumnMappingDto)
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
