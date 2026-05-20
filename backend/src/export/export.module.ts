import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { CsvExportService } from './engines/csv-export.service';
import { JsonExportService } from './engines/json-export.service';
import { XmlExportService } from './engines/xml-export.service';
import { FlatFileExportService } from './engines/flat-file-export.service';

@Module({
  controllers: [ExportController],
  providers: [
    ExportService,
    CsvExportService,
    JsonExportService,
    XmlExportService,
    FlatFileExportService,
  ],
  exports: [
    ExportService,
    CsvExportService,
    JsonExportService,
    XmlExportService,
    FlatFileExportService,
  ],
})
export class ExportModule {}
