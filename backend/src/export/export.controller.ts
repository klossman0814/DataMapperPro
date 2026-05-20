import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ExportService } from './export.service';

@Controller('export')
@UseGuards(JwtAuthGuard)
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Post()
  export(
    @Body() body: {
      rows: Record<string, any>[];
      format: string;
      options?: Record<string, any>;
    },
  ) {
    const content = this.exportService.exportData(body.rows, body.format, body.options);
    return { content, format: body.format, rowCount: body.rows.length };
  }
}
