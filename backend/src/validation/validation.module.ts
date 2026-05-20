import { Module } from '@nestjs/common';
import { ValidationController } from './validation.controller';
import { ValidationService } from './validation.service';
import { ValidationEngineService } from './engine/validation-engine.service';

@Module({
  controllers: [ValidationController],
  providers: [ValidationService, ValidationEngineService],
  exports: [ValidationService, ValidationEngineService],
})
export class ValidationModule {}
