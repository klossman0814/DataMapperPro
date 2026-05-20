import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ValidationService } from './validation.service';
import { ValidationRule } from './engine/validation-engine.service';

@Controller('validation')
@UseGuards(JwtAuthGuard)
export class ValidationController {
  constructor(private validationService: ValidationService) {}

  @Post('row')
  validateRow(
    @Body() body: { row: Record<string, any>; rules: ValidationRule[] },
  ) {
    return this.validationService.validateRow(body.row, body.rules);
  }

  @Post('rows')
  validateRows(
    @Body() body: { rows: Record<string, any>[]; rules: ValidationRule[] },
  ) {
    return this.validationService.validateRows(body.rows, body.rules);
  }
}
