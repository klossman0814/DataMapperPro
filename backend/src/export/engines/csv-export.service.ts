import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';

@Injectable()
export class CsvExportService {
  export(rows: Record<string, any>[], options?: { delimiter?: string; lineEnding?: string; includeHeaders?: boolean }): string {
    const delimiter = options?.delimiter || ',';
    const lineEnding = options?.lineEnding || '\n';
    const includeHeaders = options?.includeHeaders !== false;

    if (rows.length === 0) return '';

    const headers = Object.keys(rows[0]);

    return stringify(rows, {
      header: includeHeaders,
      delimiter,
      record_delimiter: lineEnding,
      columns: headers,
    });
  }
}
