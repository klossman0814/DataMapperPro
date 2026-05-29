import { Module } from '@nestjs/common';
import { SqlScriptsController } from './sql-scripts.controller';
import { SqlScriptsService } from './sql-scripts.service';
import { DatabaseConnectionsModule } from '../database-connections/database-connections.module';

@Module({
  imports: [DatabaseConnectionsModule],
  controllers: [SqlScriptsController],
  providers: [SqlScriptsService],
  exports: [SqlScriptsService],
})
export class SqlScriptsModule {}
