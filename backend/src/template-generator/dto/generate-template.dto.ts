import { IsString, MinLength } from 'class-validator';

export class GenerateTemplateDto {
  @IsString()
  @MinLength(1)
  sampleOutput: string;
}