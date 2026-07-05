import { Injectable } from '@nestjs/common';
import { Mapping } from '../../mappings/engine/mapping-engine.service';
import { TransformationEngineService } from '../../transformations/engine/transformation-engine.service';

const TRANSFORM_NAMES = [
  'trim', 'upper', 'lower', 'substring', 'replace',
  'padstart', 'padend', 'concat',
  'formatdate', 'parsedate',
  'round', 'formatnumber', 'parseint', 'parsefloat',
  'coalesce', 'if', 'case', 'switch', 'join',
];

@Injectable()
export class TemplateEngineService {
  constructor(
    private transformationEngine: TransformationEngineService,
  ) {}

  processTemplate(template: string, row: Record<string, any>, mappings: Mapping[], index = 0): string {
    const mappingResult: Record<string, any> = {};
    for (const m of mappings) {
      if (m.sourceField) {
        mappingResult[m.destinationField] = row[m.sourceField];
      } else if (m.constant) {
        mappingResult[m.destinationField] = this.replaceTokens(m.constant, { ...row, ...mappingResult });
      } else if (m.expression) {
        mappingResult[m.destinationField] = this.replaceTokens(m.expression, { ...row, ...mappingResult });
      }
    }

    return this.processRow(template, row, mappingResult, index);
  }

  renderPreview(template: string, row: Record<string, any>, index = 0): string {
    return this.processRow(template, row, {}, index);
  }

  private processRow(template: string, row: Record<string, any>, mappings: Record<string, any>, index = 0): string {
    const merged = { ...row, ...mappings, index, sequence: index };
    const lines = template.split('\n');
    const resultLines: string[] = [];
    const skipStack: number[] = [];
    let elseMode = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const openIf = line.match(/^\s*\{\{#if (.+?)\}\}\s*$/);
      if (openIf) {
        const fieldName = openIf[1].trim();
        const value = this.resolveValue(fieldName, merged);
        const truthy = value !== null && value !== undefined && value !== '' && value !== false && value !== 0;
        skipStack.push(truthy ? 0 : 1);
        elseMode = false;
        continue;
      }

      if (line.match(/^\s*\{\{else\}\}\s*$/)) {
        if (skipStack.length > 0) {
          skipStack[skipStack.length - 1] = skipStack[skipStack.length - 1] === 0 ? 1 : 0;
        }
        elseMode = true;
        continue;
      }

      if (line.match(/^\s*\{\{\/if\}\}\s*$/)) {
        skipStack.pop();
        elseMode = false;
        continue;
      }

      if (skipStack.some(s => s > 0)) {
        continue;
      }

      const eachMatch = line.match(/^\s*\{\{#each (.+?)\}\}(.*?)\{\{\/each\}\}\s*$/);
      if (eachMatch) {
        const fieldName = eachMatch[1].trim();
        const list = this.resolveValue(fieldName, merged);
        const innerTemplate = eachMatch[2];
        if (Array.isArray(list)) {
          const items = list.map((item: any, idx: number) => {
            const ctx = { ...merged, ...item, index: idx };
            return this.replaceTokens(innerTemplate, ctx);
          });
          resultLines.push(items.join('\n'));
        }
        continue;
      }

      const processed = this.replaceTokens(line, merged);
      resultLines.push(processed);
    }

    return resultLines.join('\n');
  }

  private resolveValue(key: string, context: Record<string, any>): any {
    if (key.startsWith('row.')) {
      return context[key.substring(4)];
    }
    return context[key];
  }

  private replaceTokens(text: string, context: Record<string, any>): string {
    return text.replace(/\{\{(.+?)\}\}/g, (_, key) => {
      const trimmed = key.trim();

      const funcMatch = trimmed.match(/^(\w+)\((.+)\)$/);
      if (funcMatch && TRANSFORM_NAMES.includes(funcMatch[1].toLowerCase())) {
        const result = this.transformationEngine.apply(trimmed, context);
        if (result === null || result === undefined) return '';
        return String(result);
      }

      const seqMatch = trimmed.match(/^(sequence|index)(?:\((.+?)\))?$/i);
      if (seqMatch) {
        const value = context.sequence ?? context.index;
        if (value === null || value === undefined) return '';
        const args = seqMatch[2] ? seqMatch[2].split(',').map(s => s.trim()) : [];
        let result = String(value);
        if (args.length >= 1 && /^\d+$/.test(args[0])) {
          const width = parseInt(args[0], 10);
          result = result.padStart(width, '0');
          if (args.length >= 2 && args[1]) result = args[1] + result;
          if (args.length >= 3 && args[2]) result = result + args[2];
        }
        return result;
      }

      const value = this.resolveValue(trimmed, context);
      if (value === null || value === undefined) return '';
      return String(value);
    });
  }
}
