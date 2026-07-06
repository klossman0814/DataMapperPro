import { IsString, IsOptional } from 'class-validator';

export class CompareFilesDto {
  @IsString()
  fileId1: string;

  @IsString()
  fileId2: string;

  @IsOptional()
  @IsString()
  keyColumn?: string;
}
