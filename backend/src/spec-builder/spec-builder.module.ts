import { Module } from '@nestjs/common';
import { SpecBuilderController } from './spec-builder.controller';
import { SpecBuilderService } from './spec-builder.service';

@Module({
  controllers: [SpecBuilderController],
  providers: [SpecBuilderService],
})
export class SpecBuilderModule {}
