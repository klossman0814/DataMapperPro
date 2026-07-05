import { IsString, IsObject, IsOptional, IsBoolean } from 'class-validator';

export class RenderInlineDto {
  @IsString()
  template: string;

  @IsObject()
  context: {
    row: Record<string, any>;
    index?: number;
    collapseNewlines?: boolean;
  };
}
