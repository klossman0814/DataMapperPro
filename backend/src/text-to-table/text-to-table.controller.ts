import { Controller, Post, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TextToTableService } from './text-to-table.service';
import { ParseTextDto } from './dto/parse-text.dto';
import { ImportTableDto } from './dto/import-table.dto';

@Controller('text-to-table')
@UseGuards(JwtAuthGuard)
export class TextToTableController {
  constructor(private service: TextToTableService) {}

  @Post('parse')
  parseText(@Body() dto: ParseTextDto) {
    return this.service.parseText(dto);
  }

  @Post('parse-file')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 500 * 1024 * 1024 },
  }))
  parseFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('sheetName') sheetName?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    return this.service.parseFile(file, sheetName);
  }

  @Post('import')
  importToDatabase(@Body() dto: ImportTableDto, @CurrentUser('id') userId: string) {
    return this.service.importToDatabase(dto, userId);
  }
}
