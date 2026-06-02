import { IsString, IsArray, IsInt, IsOptional } from 'class-validator';

export class CreateFromQueryDto {
  @IsString()
  databaseConnectionId: string;

  @IsString()
  querySql: string;

  @IsString()
  originalName: string;

  @IsArray()
  columns: any[];

  @IsArray()
  preview: any[];

  @IsInt()
  rowCount: number;
}
