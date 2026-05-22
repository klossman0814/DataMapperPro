import { Module } from '@nestjs/common';
import { DatabaseConnectionsController } from './database-connections.controller';
import { DatabaseConnectionsService } from './database-connections.service';
import { DatabaseQueryService } from './engine/database-query.service';

@Module({
  controllers: [DatabaseConnectionsController],
  providers: [DatabaseConnectionsService, DatabaseQueryService],
  exports: [DatabaseConnectionsService, DatabaseQueryService],
})
export class DatabaseConnectionsModule {}
