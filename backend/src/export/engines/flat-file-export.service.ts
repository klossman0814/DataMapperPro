import { Injectable } from '@nestjs/common';

export interface FixedWidthField {
  field: string;
  width: number;
  align?: 'left' | 'right';
  padChar?: string;
}

@Injectable()
export class FlatFileExportService {
  export(rows: Record<string, any>[], options?: { fixedWidthConfig?: FixedWidthField[]; lineEnding?: string }): string {
    const fields = options?.fixedWidthConfig || [];
    const lineEnding = options?.lineEnding || '\n';

    if (fields.length === 0) {
      return rows.map(row => JSON.stringify(row)).join(lineEnding) + lineEnding;
    }

    const lines = rows.map(row => {
      return fields.map(field => {
        const value = row[field.field] !== undefined ? String(row[field.field]) : '';
        const width = field.width;
        const align = field.align || 'left';
        const padChar = field.padChar || ' ';

        if (align === 'right') {
          return value.padStart(width, padChar);
        }
        return value.padEnd(width, padChar);
      }).join('');
    });

    return lines.join(lineEnding) + lineEnding;
  }
}
