import { Controller, Post, Get, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SpecEvaluatorService } from './spec-evaluator.service';
import { UploadSpecDto } from './dto/upload-spec.dto';

@Controller('spec-evaluator')
@UseGuards(JwtAuthGuard)
export class SpecEvaluatorController {
  constructor(private service: SpecEvaluatorService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadSpecDto,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    return this.service.upload(file, dto, userId);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll(userId, page || 1, limit || 20);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  @Post(':id/evaluate')
  @UseInterceptors(FileInterceptor('file'))
  evaluate(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
  ) {
    if (!file) throw new BadRequestException('Data file is required');
    return this.service.startEvaluation(id, file, userId);
  }

  @Get(':id/evaluations')
  listEvaluations(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.listEvaluations(id, userId);
  }

  @Get('evaluations/:evalId')
  getEvaluation(@Param('evalId') evalId: string, @CurrentUser('id') userId: string) {
    return this.service.getEvaluation(evalId, userId);
  }

  @Post(':id/generate-template')
  generateTemplate(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.generateTemplate(id, userId);
  }
}
