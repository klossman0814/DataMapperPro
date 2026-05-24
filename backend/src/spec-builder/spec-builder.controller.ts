import { Controller, Post, UseGuards, Body, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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

  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  parse(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new Error('No file provided');
    return this.service.parseXlsx(file.buffer, file.originalname);
  }
}
