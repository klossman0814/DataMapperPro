import { IsString, IsArray, IsOptional, IsBoolean, IsIn } from 'class-validator';

export class ParseTextDto {
  @IsString()
  text: string;

  @IsArray()
  @IsString({ each: true })
  separators: string[];

  @IsOptional()
  @IsString()
  @IsIn(['flat', 'hierarchical', 'hl7-flat'])
  parseMode?: string = 'flat';

  @IsOptional()
  @IsBoolean()
  hasHeader?: boolean = true;

  @IsOptional()
  @IsString()
  hl7FieldSep?: string = '|';

  @IsOptional()
  @IsString()
  hl7CompSep?: string = '^';

  @IsOptional()
  @IsString()
  hl7RepSep?: string = '~';

  @IsOptional()
  @IsString()
  hl7EscapeChar?: string = '\\';

  @IsOptional()
  @IsString()
  hl7SubCompSep?: string = '&';

  @IsOptional()
  @IsBoolean()
  hl7AutoDetect?: boolean = true;

  @IsOptional()
  @IsBoolean()
  hl7ExpandComponents?: boolean = true;
}
