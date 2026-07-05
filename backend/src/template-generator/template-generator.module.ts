import { Module } from '@nestjs/common';
import { TemplateGeneratorController } from './template-generator.controller';
import { TemplateGeneratorService } from './template-generator.service';

@Module({
  controllers: [TemplateGeneratorController],
  providers: [TemplateGeneratorService],
  exports: [TemplateGeneratorService],
})
export class TemplateGeneratorModule {}