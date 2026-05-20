import { Injectable } from '@nestjs/common';
import { ValidationEngineService, ValidationRule } from './engine/validation-engine.service';

@Injectable()
export class ValidationService {
  constructor(private engine: ValidationEngineService) {}

  validateRow(row: Record<string, any>, rules: ValidationRule[]) {
    return this.engine.validateRow(row, rules);
  }

  validateRows(rows: Record<string, any>[], rules: ValidationRule[]) {
    const results = rows.map((row, index) => ({
      row: index + 1,
      ...this.engine.validateRow(row, rules),
    }));

    const totalErrors = results.filter(r => !r.valid).length;

    return {
      results,
      summary: {
        totalRows: rows.length,
        validRows: rows.length - totalErrors,
        invalidRows: totalErrors,
      },
    };
  }
}
