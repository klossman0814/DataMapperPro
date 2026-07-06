import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiffService } from './diff.service';
import { CompareFilesDto } from './dto/compare-files.dto';

@Controller('diff')
@UseGuards(JwtAuthGuard)
export class DiffController {
  constructor(private diffService: DiffService) {}

  @Post('compare')
  compare(@Body() dto: CompareFilesDto, @CurrentUser('id') userId: string) {
    return this.diffService.compare(dto, userId);
  }
}
