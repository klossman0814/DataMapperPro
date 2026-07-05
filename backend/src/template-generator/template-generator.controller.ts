import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TemplateGeneratorService } from './template-generator.service';
import { GenerateTemplateDto } from './dto/generate-template.dto';

@Controller('template-generator')
@UseGuards(JwtAuthGuard)
export class TemplateGeneratorController {
  constructor(private readonly templateGeneratorService: TemplateGeneratorService) {}

  @Post('generate')
  generate(@Body() dto: GenerateTemplateDto) {
    return this.templateGeneratorService.generate(dto.sampleOutput);
  }
}