import { Injectable } from '@nestjs/common';

@Injectable()
export class JsonExportService {
  export(rows: Record<string, any>[], options?: { jsonLines?: boolean }): string {
    const jsonLines = options?.jsonLines === true;

    if (jsonLines) {
      return rows.map(row => JSON.stringify(row)).join('\n') + '\n';
    }

    return JSON.stringify(rows, null, 2);
  }
}
