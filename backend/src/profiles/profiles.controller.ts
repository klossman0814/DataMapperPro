import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Post()
  save(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.profilesService.save(body, userId);
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.profilesService.list(userId, search, page || 1, limit || 20);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.profilesService.get(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any, @CurrentUser('id') userId: string) {
    return this.profilesService.save({ ...body, id }, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.profilesService.delete(id);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string) {
    return this.profilesService.clone(id);
  }

  @Get(':id/export')
  exportProfile(@Param('id') id: string) {
    return this.profilesService.exportProfile(id);
  }

  @Post('import')
  importProfile(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.profilesService.importProfile(body, userId);
  }
}
