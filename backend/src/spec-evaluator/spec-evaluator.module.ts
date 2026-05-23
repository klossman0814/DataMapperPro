import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SpecEvaluatorController } from './spec-evaluator.controller';
import { SpecEvaluatorService } from './spec-evaluator.service';
import { SpecParserService } from './engine/spec-parser.service';
import { AiParserService } from './engine/ai-parser.service';
import { SpecEvaluatorEngineService } from './engine/spec-evaluator-engine.service';
import { SpecEvaluatorProcessor } from './engine/spec-evaluator.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'spec-evaluation',
    }),
  ],
  controllers: [SpecEvaluatorController],
  providers: [
    SpecEvaluatorService,
    SpecParserService,
    AiParserService,
    SpecEvaluatorEngineService,
    SpecEvaluatorProcessor,
  ],
})
export class SpecEvaluatorModule {}
