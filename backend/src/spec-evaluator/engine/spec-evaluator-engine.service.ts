import { Injectable } from '@nestjs/common';
import * as csvParse from 'csv-parse/sync';

interface ExtractedField {
  name: string;
  dataType?: string;
  required?: boolean;
  length?: number;
  validation?: string;
  description?: string;
}

interface FieldMatch {
  name: string;
  status: 'matched' | 'missing' | 'extra' | 'type_mismatch';
  expectedType?: string;
  actualType?: string;
  issue?: string;
}

interface EvaluationResult {
  score: number;
  fieldCoverage: {
    matched: string[];
    missing: string[];
    extra: string[];
    typeMismatches: { field: string; expected: string; actual: string }[];
  };
  issues: { severity: 'error' | 'warning' | 'info'; field?: string; message: string }[];
  summary: string;
  rowCount: number;
  columnCount: number;
}

@Injectable()
export class SpecEvaluatorEngineService {
  evaluateData(dataBuffer: Buffer, spec: { fields: ExtractedField[] }, format: string, delimiter?: string): EvaluationResult {
    const delimiterChar = delimiter || this.inferDelimiter(format);
    const content = dataBuffer.toString('utf-8');

    let records: Record<string, any>[];
    try {
      records = csvParse.parse(content, {
        delimiter: delimiterChar,
        columns: true,
        skip_empty_lines: true,
        relax_column_count: true,
      });
    } catch {
      try {
        records = csvParse.parse(content, {
          delimiter: delimiterChar,
          columns: false,
          skip_empty_lines: true,
        }).map((row: string[]) => {
          const obj: Record<string, any> = {};
          row.forEach((val: string, i: number) => { obj[`col_${i + 1}`] = val; });
          return obj;
        });
      } catch (err: any) {
        throw new Error(`Failed to parse data file: ${err.message}`);
      }
    }

    if (records.length === 0) {
      return {
        score: 0,
        fieldCoverage: { matched: [], missing: [], extra: [], typeMismatches: [] },
        issues: [{ severity: 'error', message: 'No data rows found' }],
        summary: 'Data file is empty.',
        rowCount: 0,
        columnCount: 0,
      };
    }

    const dataFields = Object.keys(records[0]);
    const specFields = spec.fields || [];

    const dataFieldNames = dataFields.map(f => f.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    const specFieldNames = specFields.map(f => f.name.toLowerCase().replace(/[^a-z0-9]/g, '_'));

    const matched: string[] = [];
    const missing: string[] = [];
    const extra: string[] = [];
    const typeMismatches: { field: string; expected: string; actual: string }[] = [];
    const issues: { severity: 'error' | 'warning' | 'info'; field?: string; message: string }[] = [];

    for (let i = 0; i < specFieldNames.length; i++) {
      const specName = specFieldNames[i];
      const idx = dataFieldNames.indexOf(specName);
      if (idx >= 0) {
        matched.push(specFields[i].name);
        const specField = specFields[i];
        const dataCol = dataFields[idx];
        const samples = records.slice(0, 10).map(r => r[dataCol]).filter(v => v !== null && v !== undefined && v !== '');
        if (specField.dataType && samples.length > 0) {
          const actualType = this.inferType(samples);
          if (actualType !== 'string' && specField.dataType && !specField.dataType.toLowerCase().includes(actualType)) {
            typeMismatches.push({ field: specFields[i].name, expected: specField.dataType, actual: actualType });
            issues.push({
              severity: 'warning',
              field: specFields[i].name,
              message: `Expected type "${specField.dataType}", data appears to be "${actualType}"`,
            });
          }
        }
        if (specField.required) {
          const nullCount = records.filter(r => r[dataCol] === null || r[dataCol] === undefined || r[dataCol] === '').length;
          if (nullCount === records.length) {
            issues.push({ severity: 'error', field: specFields[i].name, message: 'Required field has no data in any row' });
          }
        }
      } else {
        missing.push(specFields[i].name);
        issues.push({ severity: 'warning', field: specFields[i].name, message: 'Field defined in spec but not found in data' });
      }
    }

    for (let i = 0; i < dataFields.length; i++) {
      const dataName = dataFieldNames[i];
      if (!specFieldNames.includes(dataName)) {
        extra.push(dataFields[i]);
      }
    }

    const totalFields = Math.max(specFields.length, 1);
    const matchWeight = 0.6;
    const missingPenalty = 0.4;
    const typePenalty = 0.2;

    const matchScore = matched.length / totalFields;
    const missingRatio = missing.length / totalFields;
    const typeRatio = typeMismatches.length / totalFields;

    const score = Math.round(Math.max(0, (matchScore * matchWeight + (1 - missingRatio) * missingPenalty + (1 - typeRatio) * typePenalty)) * 100);

    const extras = extra.length > 0 ? ` ${extra.length} unexpected fields found.` : '';
    const summary = `Found ${matched.length}/${specFields.length} expected fields.${extras}`;

    return {
      score,
      fieldCoverage: { matched, missing, extra, typeMismatches },
      issues,
      summary,
      rowCount: records.length,
      columnCount: dataFields.length,
    };
  }

  private inferDelimiter(format: string): string {
    switch (format) {
      case 'csv': return ',';
      case 'tsv': return '\t';
      case 'pipe': return '|';
      default: return ',';
    }
  }

  private inferType(samples: any[]): string {
    const allIntegers = samples.every(v => /^-?\d+$/.test(String(v)));
    if (allIntegers) return 'integer';
    const allNumbers = samples.every(v => !isNaN(Number(v)) && v !== '');
    if (allNumbers) return 'number';
    const allDates = samples.every(v => !isNaN(Date.parse(String(v))));
    if (allDates) return 'date';
    return 'string';
  }
}
