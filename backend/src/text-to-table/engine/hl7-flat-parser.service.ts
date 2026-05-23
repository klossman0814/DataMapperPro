import { Injectable } from '@nestjs/common';

interface ColumnInfo {
  name: string;
  type: string;
  nullCount: number;
  sampleValues: any[];
}

interface ScanStats {
  separator: string;
  columns: number;
  rows: number;
  consistencyScore: number;
}

interface ParseOutput {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  rowCount: number;
  separatorUsed: string;
  stats: ScanStats[];
  selectedSeparator: string;
}

interface Hl7FlatOptions {
  fieldSep: string;
  compSep: string;
  repSep: string;
  escapeChar: string;
  subCompSep: string;
  autoDetect: boolean;
  expandComponents: boolean;
  hasHeader: boolean;
}

interface ParsedField {
  raw: string;
  decoded: string;
}

interface StructField {
  maxReps: number;
  maxComps: number;
  maxSubs: number;
}

interface ColumnPath {
  path: string;
  fieldIdx: number;
  repIdx: number | null;
  compIdx: number | null;
  subIdx: number | null;
}

@Injectable()
export class Hl7FlatParserService {
  parse(text: string, options: Hl7FlatOptions): ParseOutput {
    if (options.autoDetect) {
      const detected = this.detectEncoding(text, options);
      if (detected) options = detected;
    }

    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats: [], selectedSeparator: '' };
    }

    const dataStart = options.hasHeader ? 1 : 0;
    const headerLine = options.hasHeader ? lines[0] : null;
    const dataLines = lines.slice(dataStart);

    const parsedRows = dataLines.map(line => this.parseLine(line, options));
    const maxFields = parsedRows.reduce((max, r) => Math.max(max, r.length), 0);

    if (maxFields === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '', stats: [], selectedSeparator: '' };
    }

    const columnPaths = this.buildColumnPaths(parsedRows, maxFields, options, headerLine);
    const columnNames = columnPaths.map(cp => cp.path);

    const seenNames = new Map<string, number>();
    const finalNames = columnNames.map(name => {
      const key = name.toLowerCase();
      const count = seenNames.get(key) ?? 0;
      if (count > 0) {
        seenNames.set(key, count + 1);
        return `${name}_${count + 1}`;
      }
      seenNames.set(key, 1);
      return name;
    });

    const rows = parsedRows.map(parsed => {
      const row: Record<string, any> = {};
      for (let ci = 0; ci < columnPaths.length; ci++) {
        const cp = columnPaths[ci];
        const finalName = finalNames[ci];
        const fv = parsed[cp.fieldIdx];
        if (!fv) { row[finalName] = null; continue; }

        if (!options.expandComponents || (cp.repIdx === null && cp.compIdx === null && cp.subIdx === null)) {
          row[finalName] = this.coerceValue(fv.decoded);
          continue;
        }

        let val = fv.decoded || '';
        const reps = options.repSep && cp.repIdx !== null
          ? val.split(options.repSep)
          : [val];
        const rep = reps[cp.repIdx ?? 0] ?? '';
        const comps = options.compSep && cp.compIdx !== null
          ? rep.split(options.compSep)
          : [rep];
        const comp = comps[cp.compIdx ?? 0] ?? '';
        const subs = options.subCompSep && cp.subIdx !== null
          ? comp.split(options.subCompSep)
          : [comp];
        const sub = subs[cp.subIdx ?? 0] ?? '';

        row[finalName] = this.coerceValue(sub);
      }
      return row;
    });

    const columns = this.detectColumns(rows, finalNames);

    return {
      columns,
      rows,
      rowCount: rows.length,
      separatorUsed: options.fieldSep,
      stats: [],
      selectedSeparator: options.fieldSep,
    };
  }

  private detectEncoding(text: string, options: Hl7FlatOptions): Hl7FlatOptions | null {
    const firstLine = text.split(/\r?\n/).find(l => l.trim());
    if (!firstLine) return null;

    const trimmed = firstLine.trim();
    if (!trimmed.startsWith('MSH')) return null;

    const fieldSep = trimmed.length > 3 ? trimmed[3] : '|';
    const fields = trimmed.split(fieldSep);
    const encodingChars = fields.length > 1 ? fields[1] : '';

    if (encodingChars.length < 4) return options;

    return {
      fieldSep,
      compSep: encodingChars[0] || '^',
      repSep: encodingChars[1] || '~',
      escapeChar: encodingChars[2] || '\\',
      subCompSep: encodingChars[3] || '&',
      autoDetect: false,
      expandComponents: options.expandComponents,
      hasHeader: options.hasHeader,
    };
  }

  private parseLine(line: string, options: Hl7FlatOptions): ParsedField[] {
    const rawFields = line.split(options.fieldSep);
    return rawFields.map(raw => ({
      raw,
      decoded: this.decodeEscape(raw, options),
    }));
  }

  private decodeEscape(value: string, options: Hl7FlatOptions): string {
    if (!value || !options.escapeChar) return value;
    const e = options.escapeChar;
    const fs = options.fieldSep;
    const cs = options.compSep;
    const rs = options.repSep;
    const ss = options.subCompSep;

    let result = value;
    result = result.replace(new RegExp(this.escapeRegex(e) + 'F' + this.escapeRegex(e), 'g'), fs);
    result = result.replace(new RegExp(this.escapeRegex(e) + 'S' + this.escapeRegex(e), 'g'), cs);
    result = result.replace(new RegExp(this.escapeRegex(e) + 'T' + this.escapeRegex(e), 'g'), ss);
    result = result.replace(new RegExp(this.escapeRegex(e) + 'R' + this.escapeRegex(e), 'g'), rs);
    result = result.replace(new RegExp(this.escapeRegex(e) + 'E' + this.escapeRegex(e), 'g'), e);
    const doubleEscaped = this.escapeRegex(e) + this.escapeRegex(e);
    result = result.replace(new RegExp(doubleEscaped, 'g'), e);
    return result;
  }

  private buildColumnPaths(
    parsedRows: ParsedField[][],
    maxFields: number,
    options: Hl7FlatOptions,
    headerLine: string | null,
  ): ColumnPath[] {
    if (!options.expandComponents) {
      return Array.from({ length: maxFields }, (_, i) => this.pathFromHeader(i, headerLine, options));
    }

    const structs: StructField[] = [];
    for (let fi = 0; fi < maxFields; fi++) {
      structs.push(this.analyzeField(parsedRows, fi, options));
    }

    const paths: ColumnPath[] = [];
    for (let fi = 0; fi < maxFields; fi++) {
      const s = structs[fi];
      const hasReps = s.maxReps > 1;
      const hasComps = s.maxComps > 1;
      const hasSubs = s.maxSubs > 1;

      if (!hasReps && !hasComps && !hasSubs) {
        paths.push(this.pathFromHeader(fi, headerLine, options));
      } else if (hasReps && hasComps && hasSubs) {
        for (let ri = 0; ri < s.maxReps; ri++) {
          for (let ci = 0; ci < s.maxComps; ci++) {
            for (let si = 0; si < s.maxSubs; si++) {
              paths.push(this.buildPath(fi, ri + 1, ci + 1, si + 1, headerLine, options));
            }
          }
        }
      } else if (hasReps && hasComps) {
        for (let ri = 0; ri < s.maxReps; ri++) {
          for (let ci = 0; ci < s.maxComps; ci++) {
            paths.push(this.buildPath(fi, ri + 1, ci + 1, null, headerLine, options));
          }
        }
      } else if (hasReps && hasSubs) {
        for (let ri = 0; ri < s.maxReps; ri++) {
          for (let si = 0; si < s.maxSubs; si++) {
            paths.push(this.buildPath(fi, ri + 1, null, si + 1, headerLine, options));
          }
        }
      } else if (hasComps && hasSubs) {
        for (let ci = 0; ci < s.maxComps; ci++) {
          for (let si = 0; si < s.maxSubs; si++) {
            paths.push(this.buildPath(fi, null, ci + 1, si + 1, headerLine, options));
          }
        }
      } else if (hasReps) {
        for (let ri = 0; ri < s.maxReps; ri++) {
          paths.push(this.buildPath(fi, ri + 1, null, null, headerLine, options));
        }
      } else if (hasComps) {
        for (let ci = 0; ci < s.maxComps; ci++) {
          paths.push(this.buildPath(fi, null, ci + 1, null, headerLine, options));
        }
      } else if (hasSubs) {
        for (let si = 0; si < s.maxSubs; si++) {
          paths.push(this.buildPath(fi, null, null, si + 1, headerLine, options));
        }
      } else {
        paths.push(this.pathFromHeader(fi, headerLine, options));
      }
    }

    return paths;
  }

  private analyzeField(
    parsedRows: ParsedField[][],
    fieldIdx: number,
    options: Hl7FlatOptions,
  ): StructField {
    let maxReps = 1;
    let maxComps = 1;
    let maxSubs = 1;

    for (const row of parsedRows) {
      const fv = row[fieldIdx];
      if (!fv) continue;
      const val = fv.decoded || '';
      if (!val) continue;

      const reps = options.repSep ? val.split(options.repSep) : [val];
      maxReps = Math.max(maxReps, reps.length);

      for (const rep of reps) {
        const comps = options.compSep ? rep.split(options.compSep) : [rep];
        maxComps = Math.max(maxComps, comps.length);

        for (const comp of comps) {
          const subs = options.subCompSep ? comp.split(options.subCompSep) : [comp];
          maxSubs = Math.max(maxSubs, subs.length);
        }
      }
    }

    return { maxReps, maxComps, maxSubs };
  }

  private buildPath(
    fieldIdx: number,
    repIdx: number | null,
    compIdx: number | null,
    subIdx: number | null,
    headerLine: string | null,
    options: Hl7FlatOptions,
  ): ColumnPath {
    const baseName = this.fieldBaseName(fieldIdx, headerLine, options);
    const parts = [baseName];
    let actualRep: number | null = null;
    let actualComp: number | null = null;
    let actualSub: number | null = null;

    if (repIdx !== null) {
      parts.push(`rep_${repIdx}`);
      actualRep = repIdx;
    }
    if (compIdx !== null) {
      parts.push(`comp_${compIdx}`);
      actualComp = compIdx;
    }
    if (subIdx !== null) {
      parts.push(`sub_${subIdx}`);
      actualSub = subIdx;
    }

    return {
      path: parts.join('_'),
      fieldIdx,
      repIdx: actualRep,
      compIdx: actualComp,
      subIdx: actualSub,
    };
  }

  private pathFromHeader(
    fieldIdx: number,
    headerLine: string | null,
    options: Hl7FlatOptions,
  ): ColumnPath {
    return {
      path: this.fieldBaseName(fieldIdx, headerLine, options),
      fieldIdx,
      repIdx: null,
      compIdx: null,
      subIdx: null,
    };
  }

  private fieldBaseName(fieldIdx: number, headerLine: string | null, options: Hl7FlatOptions): string {
    if (headerLine) {
      const headers = headerLine.split(options.fieldSep);
      const raw = headers[fieldIdx] || `field_${fieldIdx + 1}`;
      return this.sanitizeName(raw);
    }
    return `field_${fieldIdx + 1}`;
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

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private coerceValue(value: string): any {
    if (value === null || value === undefined || value === '') return null;
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null') return null;
    return trimmed;
  }

  private detectColumns(rows: Record<string, any>[], names: string[]): ColumnInfo[] {
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
        if (allIntegers) type = 'integer';
        else if (allNumbers) type = 'number';
        else if (allDates) type = 'date';
        else if (allBooleans) type = 'boolean';
      }
      return { name, type, nullCount, sampleValues: nonNullSamples };
    });
  }
}
