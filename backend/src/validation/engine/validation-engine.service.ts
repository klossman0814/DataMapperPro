import { Injectable } from '@nestjs/common';

export interface ValidationRule {
  field: string;
  type: 'required' | 'maxLength' | 'minLength' | 'regex' | 'date' | 'email' | 'number' | 'lookup' | 'enum';
  value?: any;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fieldErrors: Record<string, string[]>;
}

@Injectable()
export class ValidationEngineService {
  validateRow(row: Record<string, any>, rules: ValidationRule[]): ValidationResult {
    const errors: string[] = [];
    const fieldErrors: Record<string, string[]> = {};

    for (const rule of rules) {
      const fieldValue = row[rule.field];
      const fieldName = rule.field;
      const message = rule.message || `Validation failed for ${fieldName}`;

      let failed = false;

      switch (rule.type) {
        case 'required':
          if (fieldValue === null || fieldValue === undefined || fieldValue === '') {
            failed = true;
          }
          break;

        case 'maxLength':
          if (fieldValue && String(fieldValue).length > (rule.value as number)) {
            failed = true;
          }
          break;

        case 'minLength':
          if (fieldValue && String(fieldValue).length < (rule.value as number)) {
            failed = true;
          }
          break;

        case 'regex':
          if (fieldValue && rule.value) {
            try {
              const regex = new RegExp(rule.value as string);
              if (!regex.test(String(fieldValue))) {
                failed = true;
              }
            } catch {
              failed = true;
            }
          }
          break;

        case 'date':
          if (fieldValue) {
            const date = new Date(fieldValue);
            if (isNaN(date.getTime())) {
              failed = true;
            }
          }
          break;

        case 'email':
          if (fieldValue) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(String(fieldValue))) {
              failed = true;
            }
          }
          break;

        case 'number':
          if (fieldValue !== null && fieldValue !== undefined && fieldValue !== '') {
            if (isNaN(Number(fieldValue))) {
              failed = true;
            }
          }
          break;

        case 'lookup':
          if (fieldValue && rule.value) {
            const lookupValues = Array.isArray(rule.value) ? rule.value : [rule.value];
            if (!lookupValues.includes(fieldValue)) {
              failed = true;
            }
          }
          break;

        case 'enum':
          if (fieldValue && rule.value) {
            const enumValues = Array.isArray(rule.value) ? rule.value : [rule.value];
            if (!enumValues.includes(fieldValue)) {
              failed = true;
            }
          }
          break;
      }

      if (failed) {
        errors.push(`${fieldName}: ${message}`);
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = [];
        }
        fieldErrors[fieldName].push(message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      fieldErrors,
    };
  }
}
