import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MappingsService } from './mappings.service';
import { CreateMappingDto } from './dto/create-mapping.dto';

@Controller('mappings')
@UseGuards(JwtAuthGuard)
export class MappingsController {
  constructor(private mappingsService: MappingsService) {}

  @Post()
  create(@Body() dto: CreateMappingDto, @CurrentUser('id') userId: string) {
    return this.mappingsService.create(dto, userId);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.mappingsService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.mappingsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateMappingDto>) {
    return this.mappingsService.update(id, dto);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.mappingsService.delete(id);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string) {
    return this.mappingsService.clone(id);
  }
}
