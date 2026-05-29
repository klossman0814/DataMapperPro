import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SqlScriptsService } from './sql-scripts.service';
import { CreateScriptSetDto } from './dto/create-script-set.dto';
import { UpdateScriptSetDto } from './dto/update-script-set.dto';
import { ExecuteScriptsDto } from './dto/execute-scripts.dto';

@Controller('sql-scripts')
@UseGuards(JwtAuthGuard)
export class SqlScriptsController {
  constructor(private readonly service: SqlScriptsService) {}

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateScriptSetDto) {
    return this.service.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.findOne(id, userId);
  }

  @Put(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateScriptSetDto,
  ) {
    return this.service.update(id, userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.service.remove(id, userId);
  }

  @Post(':id/execute')
  execute(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ExecuteScriptsDto,
  ) {
    return this.service.execute(userId, id, dto);
  }
}
