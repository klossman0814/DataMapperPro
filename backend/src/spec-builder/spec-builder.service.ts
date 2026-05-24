import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class SpecBuilderService {
  parseXlsx(buffer: Buffer, originalName: string): { name: string; fields: any[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new BadRequestException('Workbook has no sheets');
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(workbook.Sheets[sheetName], { defval: '' });

    const name = originalName.replace(/\.(xlsx|xls)$/i, '').replace(/[_-]/g, ' ').trim();

    const fields = jsonData.map((row: any) => {
      const values = Object.values(row) as string[];
      return {
        fieldNumber: parseInt(values[0] as string, 10) || 1,
        subFieldNumber: values[1] ?? '',
        fieldName: values[2] ?? '',
        required: (values[3] ?? '').toString().toUpperCase() === 'Y',
        repeating: (values[4] ?? '').toString().toUpperCase() === 'Y',
        delimiter: (values[5] ?? '').toString() || ',',
        include: (values[6] ?? '').toString().toUpperCase() !== 'N',
      };
    }).filter((f: any) => f.fieldName.trim());

    return { name, fields };
  }

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
