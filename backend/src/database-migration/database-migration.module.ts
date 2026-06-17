import { Module } from '@nestjs/common';
import { DatabaseMigrationController } from './database-migration.controller';
import { DatabaseMigrationService } from './database-migration.service';
import { MigrationEngineService } from './engine/migration-engine.service';
import { DatabaseQueryService } from '../database-connections/engine/database-query.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DatabaseMigrationController],
  providers: [DatabaseMigrationService, MigrationEngineService, DatabaseQueryService],
})
export class DatabaseMigrationModule {}
