import { Controller, Post, Body, UseGuards } from '@nestjs/common';
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

  @Post('import')
  importToDatabase(@Body() dto: ImportTableDto, @CurrentUser('id') userId: string) {
    return this.service.importToDatabase(dto, userId);
  }
}
