import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateNotificationsDto {
  @IsOptional()
  @IsBoolean()
  jobCompleted?: boolean;

  @IsOptional()
  @IsBoolean()
  jobFailed?: boolean;

  @IsOptional()
  @IsBoolean()
  weeklySummary?: boolean;

  @IsOptional()
  @IsString()
  weeklySummaryDay?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{2}:\d{2}$/, { message: 'Time must be in HH:MM format' })
  weeklySummaryTime?: string;
}
