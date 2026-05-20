import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { createReadStream, existsSync } from 'fs';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Post()
  create(@Body() dto: CreateJobDto, @CurrentUser('id') userId: string) {
    return this.jobsService.create(dto, userId);
  }

  @Get()
  findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobsService.findAll(userId, { status, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }

  @Get(':id/progress')
  async getProgress(@Param('id') id: string, @Res() res: Response) {
    const progress = await this.jobsService.getProgress(id);
    res.json(progress);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.jobsService.cancel(id);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const outputFile = await this.jobsService.getOutput(id);
    const filePath = join(process.cwd(), 'outputs', outputFile);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Output file not found on disk');
    }

    const stream = createReadStream(filePath);
    res.set({
      'Content-Disposition': `attachment; filename="${outputFile}"`,
      'Content-Type': 'application/octet-stream',
    });
    stream.pipe(res);
  }
}
