import { Controller, Post, UseGuards, Body, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SpecBuilderService } from './spec-builder.service';
import { Response } from 'express';

@Controller('spec-builder')
@UseGuards(JwtAuthGuard)
export class SpecBuilderController {
  constructor(private service: SpecBuilderService) {}

  @Post('export')
  export(@Body() body: { name: string; fields: any[] }, @Res() res: Response) {
    const buffer = this.service.generateXlsx(body.name || 'Untitled Spec', body.fields || []);
    const filename = (body.name || 'spec').replace(/[^a-zA-Z0-9]/g, '_');
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
