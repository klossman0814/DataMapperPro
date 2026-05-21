import { IsString, IsObject, IsOptional, IsInt } from 'class-validator';

export class RenderInlineDto {
  @IsString()
  template: string;

  @IsObject()
  context: {
    row: Record<string, any>;
    index?: number;
  };
}
