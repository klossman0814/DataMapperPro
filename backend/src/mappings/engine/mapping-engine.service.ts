import { Injectable } from '@nestjs/common';

export interface Mapping {
  destinationField: string;
  sourceField?: string;
  transformation?: string;
  constant?: string;
  expression?: string;
  condition?: {
    field: string;
    operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty';
    value?: any;
  };
}

@Injectable()
export class MappingEngineService {
  executeMapping(row: Record<string, any>, mappings: Mapping[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const mapping of mappings) {
      if (this.shouldSkipMapping(row, mapping)) {
        continue;
      }

      let value: any = undefined;

      if (mapping.constant !== undefined) {
        value = this.replaceTokens(mapping.constant, row);
      } else if (mapping.sourceField) {
        value = row[mapping.sourceField];
      } else if (mapping.expression) {
        value = this.evaluateExpression(mapping.expression, row);
      } else if (mapping.transformation) {
        value = this.applyTransformation(mapping.transformation, row, mapping.sourceField ? row[mapping.sourceField] : undefined);
      }

      if (mapping.transformation && value !== undefined) {
        value = this.applyTransformation(mapping.transformation, row, value);
      }

      result[mapping.destinationField] = value !== undefined ? value : null;
    }

    return result;
  }

  private shouldSkipMapping(row: Record<string, any>, mapping: Mapping): boolean {
    if (!mapping.condition) return false;

    const { field, operator, value } = mapping.condition;
    const fieldValue = row[field];

    switch (operator) {
      case 'equals': return fieldValue != value;
      case 'notEquals': return fieldValue == value;
      case 'contains': return !String(fieldValue).includes(String(value));
      case 'greaterThan': return Number(fieldValue) <= Number(value);
      case 'lessThan': return Number(fieldValue) >= Number(value);
      case 'isEmpty': return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'isNotEmpty': return fieldValue === null || fieldValue === undefined || fieldValue === '';
      default: return false;
    }
  }

  private replaceTokens(template: string, row: Record<string, any>): string {
    return template.replace(/\{\{(.+?)\}\}/g, (_, field) => {
      const trimmed = field.trim();
      return row[trimmed] !== undefined ? String(row[trimmed]) : `{{${trimmed}}}`;
    });
  }

  private evaluateExpression(expression: string, row: Record<string, any>): any {
    const expr = expression.replace(/\{\{(.+?)\}\}/g, (_, field) => {
      const trimmed = field.trim();
      const val = row[trimmed];
      if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
      return val !== undefined ? val : 'null';
    });

    const funcMatch = expr.match(/^(\w+)\((.+)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1].toLowerCase();
      const argsStr = funcMatch[2];
      const args = this.parseArgs(argsStr);

      switch (funcName) {
        case 'upper': return args[0]?.toUpperCase();
        case 'lower': return args[0]?.toLowerCase();
        case 'trim': return args[0]?.trim();
        case 'concat': return args.join('');
        case 'coalesce': return args.find(a => a !== null && a !== undefined && a !== '') || null;
        default: return expr;
      }
    }

    return expr;
  }

  private parseArgs(argsStr: string): any[] {
    const args: any[] = [];
    let current = '';
    let inQuote = false;
    for (const ch of argsStr) {
      if (ch === "'" && !inQuote) { inQuote = true; continue; }
      if (ch === "'" && inQuote) { inQuote = false; args.push(current); current = ''; continue; }
      if (ch === ',' && !inQuote) {
        const trimmed = current.trim();
        if (trimmed === 'null') args.push(null);
        else if (trimmed === 'true') args.push(true);
        else if (trimmed === 'false') args.push(false);
        else if (!isNaN(Number(trimmed))) args.push(Number(trimmed));
        else args.push(trimmed);
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) {
      const trimmed = current.trim();
      if (trimmed === 'null') args.push(null);
      else if (trimmed === 'true') args.push(true);
      else if (trimmed === 'false') args.push(false);
      else if (!isNaN(Number(trimmed))) args.push(Number(trimmed));
      else args.push(trimmed);
    }
    return args;
  }

  private applyTransformation(transformation: string, row: Record<string, any>, value: any): any {
    const lower = transformation.toLowerCase();
    if (lower.startsWith('upper')) return String(value).toUpperCase();
    if (lower.startsWith('lower')) return String(value).toLowerCase();
    if (lower.startsWith('trim')) return String(value).trim();
    if (lower.startsWith('formatdate')) {
      const match = transformation.match(/formatDate\(['"]?(.+?)['"]?\)/i);
      if (match && value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) return value;
        return this.formatDate(date, match[1]);
      }
      return value;
    }
    return value;
  }

  private formatDate(date: Date, format: string): string {
    const map: Record<string, string> = {
      yyyy: String(date.getFullYear()),
      MM: String(date.getMonth() + 1).padStart(2, '0'),
      dd: String(date.getDate()).padStart(2, '0'),
      HH: String(date.getHours()).padStart(2, '0'),
      mm: String(date.getMinutes()).padStart(2, '0'),
      ss: String(date.getSeconds()).padStart(2, '0'),
    };
    let result = format;
    for (const [key, val] of Object.entries(map)) {
      result = result.replace(key, val);
    }
    return result;
  }
}
