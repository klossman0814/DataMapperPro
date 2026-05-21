import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { RenderInlineDto } from './dto/render-inline.dto';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.templatesService.findAll(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id);
  }

  @Post()
  create(
    @Body() body: { name: string; template: string; description?: string },
    @CurrentUser('id') userId: string,
  ) {
    return this.templatesService.create(body, userId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { name?: string; template?: string; description?: string }) {
    return this.templatesService.update(id, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }

  @Post('render-inline')
  renderInline(@Body() dto: RenderInlineDto) {
    return this.templatesService.renderInline(dto);
  }

  @Post(':id/render')
  render(@Param('id') id: string, @Body() context: Record<string, any>) {
    return this.templatesService.render(id, context);
  }
}
