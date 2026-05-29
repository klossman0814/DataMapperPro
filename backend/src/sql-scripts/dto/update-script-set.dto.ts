import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

class ScriptStepDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  sql: string;

  @IsNumber()
  stepOrder: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateScriptSetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsOptional()
  @IsArray()
  @Type(() => ScriptStepDto)
  steps?: ScriptStepDto[];
}
