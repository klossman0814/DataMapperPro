import { Injectable } from '@nestjs/common';

@Injectable()
export class TransformationEngineService {
  apply(expression: string, row: Record<string, any>): any {
    const resolved = expression.replace(/\{\{(.+?)\}\}/g, (_, field) => {
      const val = row[field.trim()];
      if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
      if (val === null || val === undefined) return 'null';
      return String(val);
    });

    const funcMatch = resolved.match(/^(\w+)\((.+)\)$/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const argsStr = funcMatch[2];
      const args = this.parseArgs(argsStr, row);
      return this.executeFunction(funcName, args, row);
    }

    const num = Number(resolved);
    if (!isNaN(num)) return num;
    if (resolved === 'true') return true;
    if (resolved === 'false') return false;
    if (resolved === 'null') return null;
    return resolved.replace(/^'(.*)'$/, '$1');
  }

  private parseArgs(argsStr: string, row: Record<string, any>): any[] {
    const args: any[] = [];
    let current = '';
    let depth = 0;
    let inQuote = false;

    for (const ch of argsStr) {
      if (ch === '(') { depth++; current += ch; continue; }
      if (ch === ')') { depth--; current += ch; continue; }
      if (ch === "'" && !inQuote) { inQuote = true; current += ch; continue; }
      if (ch === "'" && inQuote) { inQuote = false; current += ch; continue; }
      if (ch === ',' && depth === 0 && !inQuote) {
        args.push(this.resolveArg(current.trim(), row));
        current = '';
        continue;
      }
      current += ch;
    }
    if (current.trim()) {
      args.push(this.resolveArg(current.trim(), row));
    }
    return args;
  }

  private resolveArg(arg: string, row: Record<string, any>): any {
    if (arg.match(/^\d+\.?\d*$/)) return Number(arg);
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    if (arg === 'null' || arg === 'undefined') return null;
    if (arg.startsWith("'") && arg.endsWith("'")) return arg.slice(1, -1);
    if (arg.startsWith('"') && arg.endsWith('"')) return arg.slice(1, -1);

    const rowVal = row[arg];
    if (rowVal !== undefined) return rowVal;

    const funcMatch = arg.match(/^(\w+)\((.+)\)$/);
    if (funcMatch) {
      const innerArgs = this.parseArgs(funcMatch[2], row);
      return this.executeFunction(funcMatch[1], innerArgs, row);
    }

    return arg;
  }

  private executeFunction(name: string, args: any[], row: Record<string, any>): any {
    switch (name.toLowerCase()) {
      case 'trim': return this.fnTrim(args);
      case 'upper': return this.fnUpper(args);
      case 'lower': return this.fnLower(args);
      case 'substring': return this.fnSubstring(args);
      case 'replace': return this.fnReplace(args);
      case 'padstart': return this.fnPadStart(args);
      case 'padend': return this.fnPadEnd(args);
      case 'concat': return this.fnConcat(args);
      case 'formatdate': return this.fnFormatDate(args);
      case 'parsedate': return this.fnParseDate(args);
      case 'round': return this.fnRound(args);
      case 'formatnumber': return this.fnFormatNumber(args);
      case 'parseint': return this.fnParseInt(args);
      case 'parsefloat': return this.fnParseFloat(args);
      case 'coalesce': return this.fnCoalesce(args);
      case 'if': return this.fnIf(args, row);
      case 'case': return this.fnCase(args);
      case 'switch': return this.fnSwitch(args);
      default: return args[0];
    }
  }

  private fnTrim(args: any[]): string {
    return String(args[0] || '').trim();
  }

  private fnUpper(args: any[]): string {
    return String(args[0] || '').toUpperCase();
  }

  private fnLower(args: any[]): string {
    return String(args[0] || '').toLowerCase();
  }

  private fnSubstring(args: any[]): string {
    const str = String(args[0] || '');
    const start = Number(args[1]) || 0;
    const end = args[2] !== undefined ? Number(args[2]) : undefined;
    return end !== undefined ? str.substring(start, end) : str.substring(start);
  }

  private fnReplace(args: any[]): string {
    const str = String(args[0] || '');
    const search = args[1] || '';
    const replacement = args[2] || '';
    return str.split(search).join(replacement);
  }

  private fnPadStart(args: any[]): string {
    const str = String(args[0] || '');
    const targetLength = Number(args[1]) || 0;
    const padChar = args[2] !== undefined ? String(args[2]) : ' ';
    return str.padStart(targetLength, padChar);
  }

  private fnPadEnd(args: any[]): string {
    const str = String(args[0] || '');
    const targetLength = Number(args[1]) || 0;
    const padChar = args[2] !== undefined ? String(args[2]) : ' ';
    return str.padEnd(targetLength, padChar);
  }

  private fnConcat(args: any[]): string {
    return args.map(a => a === null || a === undefined ? '' : String(a)).join('');
  }

  private fnFormatDate(args: any[]): string {
    const date = new Date(args[0]);
    if (isNaN(date.getTime())) return String(args[0]);
    const format = args[1] || 'yyyy-MM-dd';
    const map: Record<string, string> = {
      yyyy: String(date.getFullYear()),
      MM: String(date.getMonth() + 1).padStart(2, '0'),
      dd: String(date.getDate()).padStart(2, '0'),
      HH: String(date.getHours()).padStart(2, '0'),
      mm: String(date.getMinutes()).padStart(2, '0'),
      ss: String(date.getSeconds()).padStart(2, '0'),
    };
    let result = format;
    for (const [key, val] of Object.entries(map)) {
      result = result.replace(key, val);
    }
    return result;
  }

  private fnParseDate(args: any[]): string {
    if (!args[0]) return '';
    const date = new Date(args[0]);
    return date.toISOString();
  }

  private fnRound(args: any[]): number {
    const num = Number(args[0]) || 0;
    const decimals = args[1] !== undefined ? Number(args[1]) : 0;
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
  }

  private fnFormatNumber(args: any[]): string {
    const num = Number(args[0]) || 0;
    const format = args[1] || '0,0.00';
    if (format === '0,0') return num.toLocaleString();
    if (format === '0,0.00') return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (format === '0%') return String(num * 100) + '%';
    return String(num);
  }

  private fnParseInt(args: any[]): number {
    return parseInt(String(args[0]), 10) || 0;
  }

  private fnParseFloat(args: any[]): number {
    return parseFloat(String(args[0])) || 0;
  }

  private fnCoalesce(args: any[]): any {
    return args.find(a => a !== null && a !== undefined && a !== '') ?? null;
  }

  private fnIf(args: any[], row: Record<string, any>): any {
    const condition = args[0];
    const trueVal = args[1];
    const falseVal = args[2];
    return condition ? trueVal : falseVal;
  }

  private fnCase(args: any[]): any {
    const value = args[0];
    for (let i = 1; i < args.length - 1; i += 2) {
      if (args[i] === value) return args[i + 1];
    }
    return args[args.length - 1] !== undefined ? args[args.length - 1] : value;
  }

  private fnSwitch(args: any[]): any {
    const value = args[0];
    const cases = args[1];
    const defaultVal = args[2];
    if (typeof cases === 'object' && cases !== null) {
      return cases[value] !== undefined ? cases[value] : defaultVal;
    }
    return defaultVal;
  }
}
