import { Module } from '@nestjs/common';
import { MappingsController } from './mappings.controller';
import { MappingsService } from './mappings.service';
import { MappingEngineService } from './engine/mapping-engine.service';

@Module({
  controllers: [MappingsController],
  providers: [MappingsService, MappingEngineService],
  exports: [MappingsService, MappingEngineService],
})
export class MappingsModule {}
