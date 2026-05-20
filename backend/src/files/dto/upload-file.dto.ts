import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @IsOptional()
  @IsString()
  sheetName?: string;

  @IsOptional()
  @IsString()
  delimiter?: string = ',';

  @IsOptional()
  hasHeader?: boolean = true;
}
