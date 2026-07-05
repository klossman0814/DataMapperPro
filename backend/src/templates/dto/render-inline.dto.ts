import { IsString, IsObject, IsOptional, IsArray } from 'class-validator';

export class RenderInlineDto {
  @IsString()
  template: string;

  @IsObject()
  context: {
    row: Record<string, any>;
    index?: number;
    collapseNewlines?: boolean;
  };

  @IsOptional()
  @IsArray()
  mappings?: Record<string, any>[];
}
