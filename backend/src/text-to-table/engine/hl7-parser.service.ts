import { Injectable } from '@nestjs/common';
import { resolveColumnName } from './hl7-segment-definitions';

interface ColumnInfo {
  name: string;
  type: string;
  nullCount: number;
  sampleValues: any[];
}

interface ParseOutput {
  columns: ColumnInfo[];
  rows: Record<string, any>[];
  rowCount: number;
  separatorUsed: string;
  stats: any[];
  selectedSeparator: string;
}

interface ParseStats {
  separator: string;
  columns: number;
  rows: number;
  consistencyScore: number;
}

const OBSERVATION_SEGMENTS = new Set(['OBX']);

@Injectable()
export class Hl7ParserService {
  parse(text: string): ParseOutput {
    const messages = this.splitMessages(text);
    if (messages.length === 0) {
      return { columns: [], rows: [], rowCount: 0, separatorUsed: '|', stats: [], selectedSeparator: '|' };
    }

    const allMsgs = messages.map(msg => this.parseMessage(msg));
    const columnSet = new Map<string, { collected: any[] }>();

    for (const parsed of allMsgs) {
      for (const seg of parsed.segments) {
        if (this.isPidMshOrc(seg.type)) {
          for (const [path, val] of seg.paths) {
            if (!columnSet.has(path)) columnSet.set(path, { collected: [] });
            if (val !== null && columnSet.get(path)!.collected.length < 5) {
              columnSet.get(path)!.collected.push(val);
            }
          }
        }
      }
    }

    const obrPathsSet = new Set<string>();
    for (const parsed of allMsgs) {
      for (const o of parsed.obrObservations) {
        for (const [path, val] of o.obrPaths) {
          obrPathsSet.add(path);
          if (!columnSet.has(path)) columnSet.set(path, { collected: [] });
          if (val !== null && columnSet.get(path)!.collected.length < 5) {
            columnSet.get(path)!.collected.push(val);
          }
        }
        for (const obx of o.obxList) {
          for (const [path, val] of obx.paths) {
            if (!columnSet.has(path)) columnSet.set(path, { collected: [] });
            if (val !== null && columnSet.get(path)!.collected.length < 5) {
              columnSet.get(path)!.collected.push(val);
            }
          }
        }
      }
    }

    const orderedPaths = Array.from(columnSet.keys());
    const rows: Record<string, any>[] = [];

    for (const parsed of allMsgs) {
      const pidRow = this.buildPidRow(parsed, orderedPaths);
      for (const o of parsed.obrObservations) {
        const obrRow = this.buildObrRow(o, orderedPaths);
        for (const obx of o.obxList) {
          const obxRow = this.buildObxRow(obx, orderedPaths);
          const row: Record<string, any> = { ...pidRow, ...obrRow, ...obxRow };
          for (const path of orderedPaths) {
            if (!(path in row)) row[path] = null;
          }
          rows.push(row);
        }
        if (o.obxList.length === 0) {
          const row: Record<string, any> = { ...pidRow, ...obrRow };
          for (const path of orderedPaths) {
            if (!(path in row)) row[path] = null;
          }
          rows.push(row);
        }
      }
    }

    const columns = orderedPaths.map(path => {
      const info = columnSet.get(path)!;
      const samples = info.collected;
      let type = 'string';
      if (samples.length > 0) {
        const allIntegers = samples.every(v => /^-?\d+$/.test(String(v)));
        const allNumbers = samples.every(v => !isNaN(Number(v)) && v !== '');
        const allDates = samples.every(v => !isNaN(Date.parse(String(v))));
        if (allIntegers) type = 'integer';
        else if (allNumbers) type = 'number';
        else if (allDates) type = 'date';
      }
      return { name: path, type, nullCount: 0, sampleValues: samples };
    });

    return { columns, rows, rowCount: rows.length, separatorUsed: '|', stats: [], selectedSeparator: '|' };
  }

  private splitMessages(text: string): string[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const msgs: string[] = [];
    let current: string[] = [];
    for (const line of lines) {
      if (line.startsWith('MSH') && current.length > 0) {
        msgs.push(current.join('\n'));
        current = [line];
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) msgs.push(current.join('\n'));
    return msgs;
  }

  private parseMessage(text: string): ParsedMessage {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    const segments: ParsedSegment[] = [];
    for (const line of lines) {
      segments.push(this.parseSegment(line));
    }
    if (segments.length === 0) throw new Error('Empty message');

    if (segments.length > 0 && segments[0].type === 'MSH') {
      const encodingField = segments[0].fields[2]?.value ?? '^~\\&';
      const compSep = encodingField[0] || '^';
      const repSep = encodingField[1] || '~';
      const subSep = encodingField[3] || '&';
      for (const seg of segments) {
        seg.componentSep = compSep;
        seg.repetitionSep = repSep;
        seg.subcomponentSep = subSep;
      }
    }

    return this.buildMessage(segments);
  }

  private parseSegment(line: string): ParsedSegment {
    const rawFields = line.split('|');
    const type = rawFields[0] || '';
    const fields: FieldValue[] = rawFields.slice(1).map((raw, idx) => ({
      index: idx + 1,
      value: raw,
      raw,
    }));
    return {
      type,
      fields,
      rawFields,
      componentSep: '^',
      repetitionSep: '~',
      subcomponentSep: '&',
      paths: [],
    };
  }

  private expandPaths(
    seg: ParsedSegment,
    type: string,
    relevantFields: Set<number>,
  ): Array<[string, any]> {
    const paths: Array<[string, any]> = [];
    const compSep = seg.componentSep;
    const subSep = seg.subcomponentSep;

    for (const field of seg.fields) {
      if (!relevantFields.has(field.index)) continue;
      const raw = field.raw || '';
      const comps = raw.split(compSep);
      if (comps.length <= 1 && raw === '') {
        paths.push([resolveColumnName(type, field.index), null]);
        continue;
      }
      for (let ci = 0; ci < comps.length; ci++) {
        const compVal = comps[ci];
        const compIdx = ci + 1;
        const subs = compVal.split(subSep);
        if (subs.length <= 1) {
          const val = compVal || null;
          paths.push([resolveColumnName(type, field.index, compIdx), val]);
        } else {
          for (let si = 0; si < subs.length; si++) {
            const subVal = subs[si] || null;
            const colName = `${resolveColumnName(type, field.index, compIdx)}_${si + 1}`;
            paths.push([colName, subVal]);
          }
        }
      }
    }
    return paths;
  }

  private buildMessage(segments: ParsedSegment[]): ParsedMessage {
    const mshSeg = segments.find(s => s.type === 'MSH');
    const pidSeg = segments.find(s => s.type === 'PID');
    const mshPaths = mshSeg ? this.expandPaths(mshSeg, 'MSH', new Set([3,4,5,6,7,9,10,11,12,15,16,19])) : [];
    const pidPaths = pidSeg ? this.expandPaths(pidSeg, 'PID', new Set([1,3,5,6,7,8,10,11,13,14,15,16,17,18,19,22,23,28,29,30])) : [];

    const obsRaw = this.groupObservations(segments);
    const obrObservations: ObrObservation[] = [];

    for (const obs of obsRaw) {
      const obrSeg = obs.obr;
      const obrPaths = obrSeg
        ? this.expandPaths(obrSeg, 'OBR', new Set([1,2,3,4,7,8,10,13,14,16,24,25]))
        : [];

      const obxList: ObxObservation[] = [];
      for (const obxSeg of obs.obxes) {
        const obxPaths = this.expandPaths(obxSeg, 'OBX', new Set([1,2,3,4,5,6,7,8,9,11,12,14]));
        obxList.push({ segment: obxSeg, paths: obxPaths });
      }
      obrObservations.push({ obrSeg, obrPaths, obxList });
    }

    const allPaths = [...mshPaths, ...pidPaths];
    for (const o of obrObservations) {
      for (const p of o.obrPaths) allPaths.push(p);
      for (const obx of o.obxList) {
        for (const p of obx.paths) allPaths.push(p);
      }
    }

    return {
      segments: [mshSeg!, pidSeg!].filter(Boolean),
      mshPaths,
      pidPaths,
      obrObservations,
      allPaths,
    };
  }

  private groupObservations(segments: ParsedSegment[]): Array<{ obr: ParsedSegment | null; obxes: ParsedSegment[] }> {
    const groups: Array<{ obr: ParsedSegment | null; obxes: ParsedSegment[] }> = [];
    let current: { obr: ParsedSegment | null; obxes: ParsedSegment[] } = { obr: null, obxes: [] };

    for (const seg of segments) {
      if (seg.type === 'OBR') {
        if (current.obr || current.obxes.length > 0) {
          groups.push(current);
        }
        current = { obr: seg, obxes: [] };
      } else if (OBSERVATION_SEGMENTS.has(seg.type)) {
        current.obxes.push(seg);
      }
    }
    if (current.obr || current.obxes.length > 0) {
      groups.push(current);
    }
    return groups;
  }

  private isPidMshOrc(type: string): boolean {
    return type === 'PID' || type === 'MSH' || type === 'ORC' || type === 'PV1';
  }

  private buildPidRow(parsed: ParsedMessage, allPaths: string[]): Record<string, any> {
    const row: Record<string, any> = {};
    for (const [path, val] of parsed.mshPaths) {
      if (allPaths.includes(path)) row[path] = val;
    }
    for (const [path, val] of parsed.pidPaths) {
      if (allPaths.includes(path)) row[path] = val;
    }
    return row;
  }

  private buildObrRow(obs: ObrObservation, allPaths: string[]): Record<string, any> {
    const row: Record<string, any> = {};
    for (const [path, val] of obs.obrPaths) {
      if (allPaths.includes(path)) row[path] = val;
    }
    return row;
  }

  private buildObxRow(obx: ObxObservation, allPaths: string[]): Record<string, any> {
    const row: Record<string, any> = {};
    for (const [path, val] of obx.paths) {
      if (allPaths.includes(path)) row[path] = val;
    }
    return row;
  }
}

interface FieldValue {
  index: number;
  value: string;
  raw: string;
}

interface ParsedSegment {
  type: string;
  fields: FieldValue[];
  rawFields: string[];
  componentSep: string;
  repetitionSep: string;
  subcomponentSep: string;
  paths: Array<[string, any]>;
}

interface ObxObservation {
  segment: ParsedSegment;
  paths: Array<[string, any]>;
}

interface ObrObservation {
  obrSeg: ParsedSegment | null;
  obrPaths: Array<[string, any]>;
  obxList: ObxObservation[];
}

interface ParsedMessage {
  segments: ParsedSegment[];
  mshPaths: Array<[string, any]>;
  pidPaths: Array<[string, any]>;
  obrObservations: ObrObservation[];
  allPaths: Array<[string, any]>;
}
