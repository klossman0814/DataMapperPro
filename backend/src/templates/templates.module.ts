import { Module } from '@nestjs/common';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';
import { TemplateEngineService } from './engine/template-engine.service';
import { TransformationsModule } from '../transformations/transformations.module';

@Module({
  imports: [TransformationsModule],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplateEngineService],
  exports: [TemplatesService, TemplateEngineService],
})
export class TemplatesModule {}
