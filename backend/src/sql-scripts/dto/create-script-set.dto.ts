import { IsString, IsOptional, IsArray, IsNumber, IsBoolean, MinLength, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class ScriptStepDto {
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

export class CreateScriptSetDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  connectionId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => ScriptStepDto)
  steps: ScriptStepDto[];
}
