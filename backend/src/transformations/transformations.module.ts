import { Module } from '@nestjs/common';
import { TransformationsController } from './transformations.controller';
import { TransformationsService } from './transformations.service';
import { TransformationEngineService } from './engine/transformation-engine.service';

@Module({
  controllers: [TransformationsController],
  providers: [TransformationsService, TransformationEngineService],
  exports: [TransformationsService, TransformationEngineService],
})
export class TransformationsModule {}
