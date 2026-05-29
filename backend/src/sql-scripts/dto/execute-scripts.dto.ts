import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class ExecuteScriptsDto {
  @IsString()
  connectionId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stepIds?: string[];
}
