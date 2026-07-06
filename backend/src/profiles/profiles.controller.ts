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

  @Get('workspace/export')
  exportWorkspace(@CurrentUser('id') userId: string) {
    return this.profilesService.exportWorkspace(userId);
  }

  @Post('workspace/import')
  importWorkspace(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.profilesService.importWorkspace(body, userId);
  }

  @Post('import')
  importProfile(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.profilesService.importProfile(body, userId);
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
  delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.profilesService.delete(id, userId);
  }

  @Post(':id/clone')
  clone(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.profilesService.clone(id, userId);
  }

  @Post(':id/toggle-share')
  toggleShare(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.profilesService.toggleShare(id, userId);
  }

  @Get(':id/export')
  exportProfile(@Param('id') id: string) {
    return this.profilesService.exportProfile(id);
  }
}
