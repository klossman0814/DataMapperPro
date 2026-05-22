import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { FileProcessorService } from './processors/file-processor.service';
import { MappingsModule } from '../mappings/mappings.module';
import { TemplatesModule } from '../templates/templates.module';
import { TransformationsModule } from '../transformations/transformations.module';
import { ValidationModule } from '../validation/validation.module';
import { ExportModule } from '../export/export.module';
import { DatabaseConnectionsModule } from '../database-connections/database-connections.module';

@Module({
  imports: [
    MappingsModule,
    TemplatesModule,
    TransformationsModule,
    ValidationModule,
    ExportModule,
    DatabaseConnectionsModule,
  ],
  controllers: [JobsController],
  providers: [JobsService, FileProcessorService],
  exports: [JobsService],
})
export class JobsModule {}
