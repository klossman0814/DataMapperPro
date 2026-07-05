import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import * as csvParse from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MappingEngineService, Mapping } from '../../mappings/engine/mapping-engine.service';
import { TemplateEngineService } from '../../templates/engine/template-engine.service';
import { TransformationEngineService } from '../../transformations/engine/transformation-engine.service';
import { ValidationEngineService } from '../../validation/engine/validation-engine.service';
import { DatabaseConnectionsService } from '../../database-connections/database-connections.service';
import { CsvExportService } from '../../export/engines/csv-export.service';
import { JsonExportService } from '../../export/engines/json-export.service';
import { XmlExportService } from '../../export/engines/xml-export.service';
import { FlatFileExportService } from '../../export/engines/flat-file-export.service';

@Injectable()
export class FileProcessorService {
  private outputDir: string;

  constructor(
    private prisma: PrismaService,
    private mappingEngine: MappingEngineService,
    private templateEngine: TemplateEngineService,
    private transformationEngine: TransformationEngineService,
    private validationEngine: ValidationEngineService,
    private dbConnections: DatabaseConnectionsService,
    private csvExport: CsvExportService,
    private jsonExport: JsonExportService,
    private xmlExport: XmlExportService,
    private flatFileExport: FlatFileExportService,
  ) {
    this.outputDir = join(process.cwd(), 'outputs');
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async processJob(jobId: string) {
    const job = await this.prisma.processingJob.findUnique({
      where: { id: jobId },
      include: {
        uploadedFile: true,
        profile: true,
      },
    });

    if (!job) {
      throw new Error('Job not found');
    }

    const config = job.config as any;
    const mappings: Mapping[] = config.mappings || [];
    const template = config.template || job.profile?.template || '';
    const outputFormat = job.outputFormat;
    const outputOptions = config.outputOptions || {};
    const collapseNewlines = config.collapseNewlines ?? false;

    let rows: Record<string, any>[];
    try {
      if (job.uploadedFile?.databaseConnectionId && job.uploadedFile?.querySql) {
        const result = await this.dbConnections.executeQuery(
          job.uploadedFile.databaseConnectionId,
          job.uploadedFile.querySql,
          job.createdById,
        );
        rows = result.rows;
      } else if (job.databaseConnectionId && job.querySql) {
        const result = await this.dbConnections.executeQuery(job.databaseConnectionId, job.querySql, job.createdById);
        rows = result.rows;
      } else if (job.uploadedFile) {
        rows = await this.loadRows(job.uploadedFile.filename, config);
      } else {
        throw new Error('No data source configured for this job');
      }
    } catch (err: any) {
      await this.markFailed(jobId, 'Query failed: ' + err.message);
      return;
    }

    try {
      await this.prisma.processingJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
          totalRows: rows.length,
        },
      });

      const processedRows: Record<string, any>[] = [];
      const errors: { row: number; message: string }[] = [];

      const startIndex = config.startIndex ?? 1;
      for (let i = 0; i < rows.length; i++) {
        if (await this.isCancelled(jobId)) {
          errors.push({ row: i + 1, message: 'Job cancelled by user' });
          break;
        }
        try {
          const rowIndex = startIndex + i;
          const mapped = this.mappingEngine.executeMapping(rows[i], mappings);
          const transformed = this.applyTransformations(mapped, config.transformations);
          const output = template
            ? { output: this.templateEngine.processTemplate(template, transformed, mappings, rowIndex, collapseNewlines) as string }
            : { ...transformed, index: rowIndex };

          const validation = this.validationEngine.validateRow(output, config.validationRules || []);
          if (!validation.valid) {
            errors.push({ row: i + 1, message: validation.errors.join('; ') });
            await this.updateProgress(jobId, 0, 1);
            continue;
          }

          processedRows.push(output);
          await this.updateProgress(jobId, 1, 0);
        } catch (err: any) {
          errors.push({ row: i + 1, message: err.message });
          await this.updateProgress(jobId, 0, 1);
        }
      }

      if (await this.isCancelled(jobId)) {
        await this.prisma.processingJob.update({
          where: { id: jobId },
          data: {
            errorLog: errors.length > 0
              ? JSON.parse(JSON.stringify(errors)) as Prisma.InputJsonValue
              : Prisma.JsonNull,
          },
        });
      } else {
        const outputFilename = config.fileExtension
        ? `${uuid()}.${config.fileExtension}`
        : `${uuid()}.${this.getExtension(outputFormat)}`;
        const outputPath = join(this.outputDir, outputFilename);
        await this.writeOutput(outputPath, processedRows, outputFormat, outputOptions);

        await this.prisma.processingJob.update({
          where: { id: jobId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            outputFile: outputFilename,
            errorLog: errors.length > 0 ? JSON.parse(JSON.stringify(errors)) as Prisma.InputJsonValue : Prisma.JsonNull,
          },
        });
      }
    } catch (err: any) {
      await this.markFailed(jobId, err.message);
    }
  }

  private async markFailed(jobId: string, message: string) {
    await this.prisma.processingJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorLog: JSON.parse(JSON.stringify([{ message }])) as Prisma.InputJsonValue,
      },
    });
  }

  private async loadRows(filename: string, config: any): Promise<Record<string, any>[]> {
    const filePath = join(process.cwd(), 'uploads', filename);
    if (!existsSync(filePath)) {
      throw new Error('Source file not found');
    }

    const isExcel = filename.endsWith('.xlsx') || filename.endsWith('.xls');

    if (isExcel) {
      const workbook = XLSX.readFile(filePath);
      const sheetName = config.sheetName || workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];
    }

    const fs = await import('fs/promises');
    const content = await fs.readFile(filePath, 'utf-8');
    const delimiter = config.delimiter || ',';
    const hasHeader = config.hasHeader !== false;

    return csvParse.parse(content, {
      delimiter,
      columns: hasHeader,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, any>[];
  }

  private applyTransformations(row: Record<string, any>, transformations?: { field: string; expression: string }[]): Record<string, any> {
    if (!transformations) return row;
    const result = { ...row };
    for (const t of transformations) {
      try {
        result[t.field] = this.transformationEngine.apply(t.expression, row);
      } catch {
        // skip failed transformation
      }
    }
    return result;
  }

  private async isCancelled(jobId: string): Promise<boolean> {
    const job = await this.prisma.processingJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    return job?.status === 'FAILED';
  }

  private async updateProgress(jobId: string, processed: number, failed: number) {
    await this.prisma.processingJob.update({
      where: { id: jobId },
      data: {
        processedRows: { increment: processed },
        failedRows: { increment: failed },
      },
    });
  }

  private getExtension(format: string): string {
    const map: Record<string, string> = {
      csv: 'csv',
      json: 'json',
      xml: 'xml',
      txt: 'txt',
      hl7: 'hl7',
      pipe: 'txt',
      tab: 'tsv',
      fixedwidth: 'txt',
      freeform: 'txt',
    };
    return map[format] || 'txt';
  }

  private async writeOutput(
    filePath: string,
    rows: Record<string, any>[],
    format: string,
    options: any,
  ): Promise<void> {
    switch (format) {
      case 'csv':
      case 'pipe':
      case 'tab':
        const delimiter = format === 'pipe' ? '|' : format === 'tab' ? '\t' : options.delimiter || ',';
        const csvContent = this.csvExport.export(rows, { ...options, delimiter });
        await writeFile(filePath, csvContent);
        break;
      case 'json':
        const jsonContent = this.jsonExport.export(rows, options);
        await writeFile(filePath, jsonContent);
        break;
      case 'xml':
        const xmlContent = this.xmlExport.export(rows, options);
        await writeFile(filePath, xmlContent);
        break;
      case 'fixedwidth':
        const fwContent = this.flatFileExport.export(rows, options);
        await writeFile(filePath, fwContent);
        break;
      case 'freeform':
        const freeformContent = rows
          .map((r) => (r.output || Object.values(r).join('|')).replace(/\r?\n$/, ''))
          .join('\n');
        await writeFile(filePath, freeformContent);
        break;
      default:
        const defaultContent = this.csvExport.export(rows, options);
        await writeFile(filePath, defaultContent);
    }
  }
}
