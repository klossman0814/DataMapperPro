import { Controller, Get, Post, Put, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DatabaseConnectionsService } from './database-connections.service';
import { QueryResult } from './engine/database-query.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

@Controller('database-connections')
@UseGuards(JwtAuthGuard)
export class DatabaseConnectionsController {
  constructor(private service: DatabaseConnectionsService) {}

  @Post()
  create(@Body() dto: CreateConnectionDto, @CurrentUser('id') userId: string) {
    return this.service.create(dto, userId);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.service.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.findOne(id, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateConnectionDto, @CurrentUser('id') userId: string) {
    return this.service.update(id, dto, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.delete(id, userId);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.service.testConnection(id, userId);
  }

  @Post(':id/query')
  query(@Param('id') id: string, @Body('sql') sql: string, @CurrentUser('id') userId: string): Promise<QueryResult> {
    return this.service.executeQuery(id, sql, userId);
  }
}
