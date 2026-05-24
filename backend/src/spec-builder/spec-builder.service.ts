import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class SpecBuilderService {
  generateXlsx(name: string, fields: any[]): Buffer {
    const headers = ['Field #', 'Sub-Field #', 'Field Name', 'Required', 'Repeating', 'Delimiter', 'Include'];

    const data = fields.map(f => [
      f.fieldNumber ?? '',
      f.subFieldNumber ?? '',
      f.fieldName ?? '',
      f.required ? 'Y' : 'N',
      f.repeating ? 'Y' : 'N',
      f.delimiter || ',',
      f.include !== false ? 'Y' : 'N',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

    ws['!cols'] = [
      { wch: 10 },
      { wch: 14 },
      { wch: 22 },
      { wch: 10 },
      { wch: 11 },
      { wch: 11 },
      { wch: 9 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fields');
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
  }
}
