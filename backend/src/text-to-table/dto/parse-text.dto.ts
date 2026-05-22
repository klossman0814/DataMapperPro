import { IsString, IsArray, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class ParseTextDto {
  @IsString()
  text: string;

  @IsArray()
  @IsString({ each: true })
  separators: string[];

  @IsOptional()
  @IsString()
  @IsIn(['flat', 'hierarchical'])
  parseMode?: string = 'flat';

  @IsOptional()
  @IsBoolean()
  hasHeader?: boolean = true;
}
