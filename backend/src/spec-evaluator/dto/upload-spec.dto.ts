import { IsString, IsOptional } from 'class-validator';

export class UploadSpecDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tags?: string;
}
