import { Injectable } from '@nestjs/common';
import { CsvExportService } from './engines/csv-export.service';
import { JsonExportService } from './engines/json-export.service';
import { XmlExportService } from './engines/xml-export.service';
import { FlatFileExportService } from './engines/flat-file-export.service';

@Injectable()
export class ExportService {
  constructor(
    private csvExport: CsvExportService,
    private jsonExport: JsonExportService,
    private xmlExport: XmlExportService,
    private flatFileExport: FlatFileExportService,
  ) {}

  exportData(
    rows: Record<string, any>[],
    format: string,
    options?: Record<string, any>,
  ): string {
    switch (format) {
      case 'csv':
      case 'pipe':
        const delimiter = format === 'pipe' ? '|' : (options?.delimiter || ',');
        return this.csvExport.export(rows, { ...options, delimiter });

      case 'tab':
        return this.csvExport.export(rows, { ...options, delimiter: '\t' });

      case 'json':
        return this.jsonExport.export(rows, options);

      case 'xml':
        return this.xmlExport.export(rows, options);

      case 'fixedwidth':
        return this.flatFileExport.export(rows, options);

      default:
        return this.csvExport.export(rows, options);
    }
  }
}
