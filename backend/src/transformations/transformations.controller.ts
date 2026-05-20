import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TransformationsService } from './transformations.service';

@Controller('transformations')
@UseGuards(JwtAuthGuard)
export class TransformationsController {
  constructor(private transformationsService: TransformationsService) {}

  @Post('apply')
  apply(@Body() body: { expression: string; row: Record<string, any> }) {
    return this.transformationsService.transform(body.expression, body.row);
  }

  @Post('apply-row')
  applyRow(@Body() body: { mappings: { destination: string; expression: string }[]; row: Record<string, any> }) {
    return this.transformationsService.transformRow(body.mappings, body.row);
  }
}
