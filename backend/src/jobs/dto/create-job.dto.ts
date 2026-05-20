import { IsString, IsOptional, IsUUID, IsObject } from 'class-validator';

export class CreateJobDto {
  @IsUUID()
  fileId: string;

  @IsUUID()
  profileId: string;

  @IsString()
  outputFormat: string;

  @IsOptional()
  @IsObject()
  outputOptions?: {
    delimiter?: string;
    lineEnding?: string;
    encoding?: string;
    fixedWidthConfig?: { field: string; width: number; align: string; padChar: string }[];
  };
}
