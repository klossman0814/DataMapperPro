import { Injectable } from '@nestjs/common';
import { Hl7ParserService } from './hl7-parser.service';

export interface ColumnInfo {
  name: string;
  type: string;
  nullCount: number;
  sampleValues: any[];
}

export interface ParseResult {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  rowCount: number;
  separatorUsed: string;
}

export interface ParseStats {
  separator: string;
  columns: number;
  rows: number;
  consistencyScore: number;
}

export interface ParseOutput extends ParseResult {
  stats: ParseStats[];
  selectedSeparator: string;
}

@Injectable()
export class TextParserService {
  constructor(private hl7Parser: Hl7ParserService) {}

  parse(text: string, separators: string[], parseMode: string, hasHeader: boolean): ParseOutput {
    if (!text.trim()) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats: [], selectedSeparator: '' };
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats: [], selectedSeparator: '' };
    }

    if (parseMode === 'hierarchical') {
      const firstLine = lines[0].trim();
      if (firstLine.startsWith('MSH|')) {
        return this.hl7Parser.parse(text);
      }
      return this.parseHierarchical(lines, separators, hasHeader);
    }

    const stats: ParseStats[] = separators.map(sep => this.scoreSeparator(lines, sep, 'flat'));
    const combinedPattern = this.buildCombinedPattern(separators);
    const dataStart = hasHeader ? 1 : 0;
    const headerRow = hasHeader ? this.splitCombined(lines[0], combinedPattern) : null;
    const dataLines = lines.slice(dataStart);

    const columnCounts = dataLines.map(line => this.splitCombined(line, combinedPattern).length);
    const maxCols = Math.max(...columnCounts, 0);
    if (maxCols === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats, selectedSeparator: '' };
    }

    const seenNames = new Map<string, number>();
    let columnNames: string[] = [];
    if (headerRow && headerRow.length > 0) {
      columnNames = headerRow.map(h => this.sanitizeName(h));
      while (columnNames.length < maxCols) {
        columnNames.push(`col_${columnNames.length + 1}`);
      }
    } else {
      columnNames = Array.from({ length: maxCols }, (_, i) => `col_${i + 1}`);
    }

    const finalNames = columnNames.map(name => {
      const key = name.toLowerCase();
      if (seenNames.has(key)) {
        const count = seenNames.get(key)! + 1;
        seenNames.set(key, count);
        return `${name}_${count}`;
      }
      seenNames.set(key, 1);
      return name;
    });

    const rows = dataLines.map(line => {
      const fields = this.splitCombined(line, combinedPattern);
      const row: Record<string, any> = {};
      for (let i = 0; i < maxCols; i++) {
        row[finalNames[i]] = i < fields.length ? this.coerceValue(fields[i]) : null;
      }
      return row;
    });

    const columns = this.detectColumns(rows, finalNames);
    const separatorUsed = separators.join('');
    return { columns, rows, rowCount: rows.length, separatorUsed, stats, selectedSeparator: separatorUsed };
  }

  private buildCombinedPattern(separators: string[]): RegExp {
    const escaped = separators.map(s => this.escapeRegex(s)).join('');
    return new RegExp(`[${escaped}]`);
  }

  private splitCombined(line: string, pattern: RegExp): string[] {
    return this.parseQuotedFields(line.trim(), pattern);
  }

  private parseHierarchical(lines: string[], separators: string[], hasHeader: boolean): ParseOutput {
    const stats: ParseStats[] = separators.map(sep => this.scoreSeparator(lines, sep, 'hierarchical'));
    const best = stats.reduce((a, b) => (a.consistencyScore > b.consistencyScore ? a : b));
    if (best.consistencyScore === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats, selectedSeparator: '' };
    }

    const secondarySeps = separators.filter(s => s !== best.separator);
    const dataStart = hasHeader ? 1 : 0;
    const headerRow = hasHeader ? this.splitLine(lines[0], best.separator, 'hierarchical') : null;
    const dataLines = lines.slice(dataStart);

    const columnCounts = dataLines.map(line => this.splitLine(line, best.separator, 'hierarchical').length);
    const maxCols = Math.max(...columnCounts, 0);
    if (maxCols === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats, selectedSeparator: '' };
    }

    const seenNames = new Map<string, number>();
    let columnNames: string[] = [];
    if (headerRow && headerRow.length > 0) {
      columnNames = headerRow.map(h => this.sanitizeName(h));
      while (columnNames.length < maxCols) {
        columnNames.push(`col_${columnNames.length + 1}`);
      }
    } else {
      columnNames = Array.from({ length: maxCols }, (_, i) => `field_${i + 1}`);
    }

    const finalNames = columnNames.map(name => {
      const key = name.toLowerCase();
      if (seenNames.has(key)) {
        const count = seenNames.get(key)! + 1;
        seenNames.set(key, count);
        return `${name}_${count}`;
      }
      seenNames.set(key, 1);
      return name;
    });

    const rows = dataLines.map(line => {
      const fields = this.splitLine(line, best.separator, 'hierarchical');
      const row: Record<string, any> = {};
      for (let i = 0; i < maxCols; i++) {
        row[finalNames[i]] = i < fields.length ? this.coerceValue(fields[i]) : null;
      }
      return row;
    });

    let columns = this.detectColumns(rows, finalNames);

    if (secondarySeps.length > 0) {
      const expanded = this.expandHierarchical(rows, columns, finalNames, secondarySeps, best.separator);
      if (expanded) {
        return { ...expanded, stats, selectedSeparator: best.separator };
      }
    }

    return { columns, rows, rowCount: rows.length, separatorUsed: best.separator, stats, selectedSeparator: best.separator };
  }

  private expandHierarchical(
    rows: Record<string, any>[],
    columns: ColumnInfo[],
    names: string[],
    secondarySeps: string[],
    primarySep: string,
  ): ParseResult | null {
    const sepPattern = new RegExp(`[${secondarySeps.map(s => this.escapeRegex(s)).join('')}]`);
    const expandedRows: Record<string, any>[] = [];
    const expandedNames: string[] = [];

    for (const name of names) {
      const subValues = rows.map(r => String(r[name] ?? '')).filter(v => v && sepPattern.test(v));
      if (subValues.length > rows.length * 0.5) {
        let maxSub = 1;
        for (const sv of subValues) {
          const parts = sv.split(sepPattern);
          maxSub = Math.max(maxSub, parts.length);
        }
        for (let i = 0; i < maxSub; i++) {
          expandedNames.push(`${name}_sub${i + 1}`);
        }
      } else {
        expandedNames.push(name);
      }
    }

    let colIdx = 0;
    for (const name of names) {
      const sepPatternLocal = new RegExp(`[${secondarySeps.map(s => this.escapeRegex(s)).join('')}]`);
      const subValues = rows.map(r => String(r[name] ?? '')).filter(v => v && sepPatternLocal.test(v));
      if (subValues.length > rows.length * 0.5) {
        const partsList = rows.map(r => String(r[name] ?? '').split(sepPatternLocal));
        const maxSub = Math.max(...partsList.map(p => p.length), 1);
        for (let i = 0; i < maxSub; i++) {
          expandedNames[colIdx] = `${name}_sub${i + 1}`;
          colIdx++;
        }
      } else {
        colIdx++;
      }
    }

    for (const row of rows) {
      const expandedRow: Record<string, any> = {};
      let colIdx = 0;
      for (const name of names) {
        const sepPatternLocal = new RegExp(`[${secondarySeps.map(s => this.escapeRegex(s)).join('')}]`);
        const val = String(row[name] ?? '');
        const subValues = rows.filter(r => r !== row).map(r => String(r[name] ?? '')).filter(v => v && sepPatternLocal.test(v));
        if (subValues.length > (rows.length - 1) * 0.5) {
          const parts = val.split(sepPatternLocal);
          for (let i = 0; i < expandedNames.length - colIdx; i++) {
            if (colIdx < expandedNames.length) {
              const relIdx = colIdx - (expandedNames.findIndex(n => n === name || n.startsWith(name + '_sub')));
              if (relIdx >= 0 && relIdx < parts.length) {
                expandedRow[expandedNames[colIdx]] = this.coerceValue(parts[relIdx]);
              } else if (colIdx >= names.indexOf(name) + 1) {
                break;
              }
              colIdx++;
            }
          }
          const startIdx = expandedNames.findIndex(n => n === name || n.startsWith(name + '_sub'));
          const endIdx = expandedNames.slice(startIdx).findIndex(n => !n.startsWith(name + '_sub')) + startIdx;
          const actualEnd = endIdx >= startIdx ? endIdx : expandedNames.length;
          for (let j = startIdx; j < actualEnd; j++) {
            const partIdx = j - startIdx;
            expandedRow[expandedNames[j]] = partIdx < parts.length ? this.coerceValue(parts[partIdx]) : null;
          }
          colIdx = actualEnd;
        } else {
          if (colIdx < expandedNames.length) {
            expandedRow[expandedNames[colIdx]] = row[name];
            colIdx++;
          }
        }
      }
      expandedRows.push(expandedRow);
    }

    const finalColumns = this.detectColumns(expandedRows, expandedNames);

    return { columns: finalColumns, rows: expandedRows, rowCount: expandedRows.length, separatorUsed: primarySep };
  }

  private scoreSeparator(lines: string[], separator: string, parseMode: string): ParseStats {
    if (lines.length === 0) return { separator, columns: 0, rows: 0, consistencyScore: 0 };

    const counts = lines.slice(0, 100).map(line => this.splitLine(line, separator, parseMode).length);
    const validCounts = counts.filter(c => c > 0);
    if (validCounts.length === 0) return { separator, columns: 0, rows: 0, consistencyScore: 0 };

    const min = Math.min(...validCounts);
    const max = Math.max(...validCounts);
    if (min === 0) return { separator, columns: 0, rows: 0, consistencyScore: 0 };

    const mode = this.mode(validCounts);
    const consistentLines = validCounts.filter(c => c === mode).length;
    const consistencyScore = (consistentLines / validCounts.length) * Math.log2(mode + 1);

    return { separator, columns: mode, rows: validCounts.length, consistencyScore };
  }

  private splitLine(line: string, separator: string, parseMode: string): string[] {
    const trimmed = line.trim();
    if (!trimmed) return [];

    if (parseMode === 'hierarchical') {
      const escaped = this.escapeRegex(separator);
      return this.parseQuotedFields(trimmed, new RegExp(escaped));
    }

    const sepPattern = separator.length === 1 && /[\\^$.*+?()|[\]{}]/.test(separator)
      ? new RegExp(this.escapeRegex(separator))
      : separator;

    if (sepPattern instanceof RegExp) {
      return this.parseQuotedFields(trimmed, sepPattern);
    }

    return this.parseQuotedFields(trimmed, new RegExp(this.escapeRegex(separator)));
  }

  private parseQuotedFields(line: string, separatorRe: RegExp): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
        i++;
      } else if (!inQuotes && ch.match(separatorRe)) {
        fields.push(current);
        current = '';
        i++;
      } else {
        current += ch;
        i++;
      }
    }
    fields.push(current);
    return fields.map(f => f.trim());
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private sanitizeName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/_+/g, '_')
      || 'column';
  }

  private coerceValue(value: string): any {
    if (value === null || value === undefined || value === '') return null;
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }

  private mode(arr: number[]): number {
    const freq = new Map<number, number>();
    for (const n of arr) freq.set(n, (freq.get(n) || 0) + 1);
    let maxCount = 0;
    let modeVal = arr[0];
    for (const [n, c] of freq) {
      if (c > maxCount) { maxCount = c; modeVal = n; }
    }
    return modeVal;
  }

  private detectColumns(rows: Record<string, any>[], names: string[]): ColumnInfo[] {
    const totalRows = rows.length;
    return names.map(name => {
      const values = rows.map(r => r[name]);
      const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
      const nonNullSamples = values.filter(v => v !== null && v !== undefined && v !== '').slice(0, 5);
      let type = 'string';
      if (nonNullSamples.length > 0) {
        const allIntegers = nonNullSamples.every(v => /^-?\d+$/.test(String(v)));
        const allNumbers = nonNullSamples.every(v => !isNaN(Number(v)) && v !== '');
        const allDates = nonNullSamples.every(v => !isNaN(Date.parse(String(v))));
        const allBooleans = nonNullSamples.every(v => ['true', 'false', '1', '0', 'yes', 'no'].includes(String(v).toLowerCase()));
        if (allIntegers && nonNullSamples.length > 0) type = 'integer';
        else if (allNumbers) type = 'number';
        else if (allDates) type = 'date';
        else if (allBooleans) type = 'boolean';
      }
      return { name, type, nullCount, sampleValues: nonNullSamples };
    });
  }
}
