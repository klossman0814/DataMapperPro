import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseMigrationService } from './database-migration.service';
import { DiscoverColumnsDto, PreviewRowsDto, RunMigrationDto } from './dto/run-migration.dto';

@Controller('database-migration')
@UseGuards(JwtAuthGuard)
export class DatabaseMigrationController {
  constructor(private service: DatabaseMigrationService) {}

  @Post('discover-tables')
  discoverTables(@Body('connectionId') connectionId: string, @CurrentUser('id') userId: string) {
    return this.service.discoverTables(connectionId, userId);
  }

  @Post('discover-columns')
  discoverColumns(@Body() dto: DiscoverColumnsDto, @CurrentUser('id') userId: string) {
    return this.service.discoverColumns(dto, userId);
  }

  @Post('preview')
  preview(@Body() dto: PreviewRowsDto, @CurrentUser('id') userId: string) {
    return this.service.previewRows(dto, userId);
  }

  @Post('run')
  run(@Body() dto: RunMigrationDto, @CurrentUser('id') userId: string) {
    return this.service.runMigration(dto, userId);
  }
}
