import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';

interface ExtractedField {
  name: string;
  dataType?: string;
  length?: number;
  required?: boolean;
  description?: string;
  sourcePosition?: number;
  subFieldPosition?: number;
  defaultValue?: string;
  validation?: string;
  repeating?: boolean;
  delimiter?: string;
}

interface FormatSpec {
  type: string;
  delimiter?: string;
  headerRow?: boolean;
  encoding?: string;
}

interface SpecSection {
  heading: string;
  content: string;
  level: number;
}

interface ParsedSpec {
  name: string;
  fields: ExtractedField[];
  formats: FormatSpec[];
  rules: string[];
  notes: string[];
  sections: SpecSection[];
  sourceText?: string;
  hasSubFields?: boolean;
}

const FIELD_PATTERNS = [
  /(?:field|column|element|tag)\s*[:\s]+(.+?)(?:\s*[-–—]\s*(.+))?/i,
  /(\w[\w\s]*)\s+(\w+(?:\(\d+(?:,\d+)?\))?)\s+(required|optional|mandatory)?/i,
];

const TYPE_PATTERNS = [
  /(?:varchar|char)\s*\((\d+)\)/i,
  /(?:numeric|decimal|number)\s*(?:\((\d+)(?:,\s*(\d+))?\))?/i,
  /\b(int(?:eger)?|bigint|smallint)\b/i,
  /\b(date|datetime|timestamp|time)\b/i,
  /\b(boolean|bool|bit)\b/i,
  /\b(text|longtext|memo|ntext)\b/i,
];

const FORMAT_PATTERNS = [
  /(?:pipe|pipe-delimited|delimited\s*\|)/i,
  /(?:comma|comma-separated|csv)/i,
  /(?:tab|tab-delimited|tsv)/i,
  /(?:fixed|fixed-width|fixedwidth)/i,
  /(?:hl7)/i,
  /(?:json)/i,
  /(?:xml)/i,
];

const DELIMITER_MAP: Record<string, string> = {
  pipe: '|',
  comma: ',',
  tab: '\t',
  csv: ',',
  tsv: '\t',
};

@Injectable()
export class SpecParserService {
  private readonly logger = new Logger(SpecParserService.name);

  async parse(file: Express.Multer.File, originalName: string, delimiter?: string): Promise<ParsedSpec> {
    const ext = originalName.toLowerCase().split('.').pop() || '';

    switch (ext) {
      case 'docx':
        return this.parseDocx(file.buffer);
      case 'xlsx':
      case 'xls':
        return this.parseXlsx(file.buffer);
      case 'pdf':
        return this.parsePdf(file.buffer);
      case 'txt':
      case 'csv':
      case 'tsv':
      case 'dat':
      case 'hl7':
        return this.parseText(file.buffer, delimiter);
      default:
        throw new Error(`Unsupported file type: .${ext}`);
    }
  }

  private async parseDocx(buffer: Buffer): Promise<ParsedSpec> {
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value;

    const text = html
      .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, (m: string, c: string) => `\n## ${c}\n`)
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1')
      .replace(/<t[hd][^>]*>(.*?)<\/t[hd]>/gi, ' $1 |')
      .replace(/<tr[^>]*>(.*?)<\/tr>/gi, '|$1\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/ +/g, ' ')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l)
      .join('\n');

    if (result.messages.some((m: any) => m.type === 'error')) {
      this.logger.warn('Mammoth warnings during docx parsing');
    }

    return this.parseStructuredText(text);
  }

  private parseXlsx(buffer: Buffer): ParsedSpec {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sections: SpecSection[] = [];
    const allText: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      if (jsonData.length > 0) {
        const colNames = Object.keys(jsonData[0]);
        allText.push(`## ${sheetName}`);
        allText.push(colNames.join(' | '));
        for (const row of jsonData) {
          allText.push(colNames.map(c => String(row[c] ?? '').replace(/\|/g, '\v')).join(' | '));
        }
        sections.push({
          heading: sheetName,
          content: jsonData.map(r => Object.values(r).map(v => String(v ?? '').replace(/\|/g, '\v')).join(' | ')).join('\n'),
          level: 1,
        });
      }
    }

    return this.parseStructuredText(allText.join('\n'));
  }

  private async parsePdf(buffer: Buffer): Promise<ParsedSpec> {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);

    const text = data.text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l)
      .join('\n');

    return this.parseStructuredText(text);
  }

  private parseText(buffer: Buffer, delimiter?: string): ParsedSpec {
    let text = buffer.toString('utf-8');

    if (delimiter && delimiter !== '|') {
      text = text
        .split('\n')
        .map(line => {
          const parts = this.splitByDelimiter(line, delimiter);
          return parts.join('|');
        })
        .join('\n');
    }

    text = text
      .split('\n')
      .map(l => l.trim())
      .filter(l => l)
      .join('\n');

    return this.parseStructuredText(text);
  }

  private splitByDelimiter(line: string, delimiter: string): string[] {
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        current += ch;
      } else if (!inQuotes && ch === delimiter) {
        parts.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts;
  }

  private parseStructuredText(text: string): ParsedSpec {
    const sections: SpecSection[] = [];
    const fields: ExtractedField[] = [];
    const formats: FormatSpec[] = [];
    const rules: string[] = [];
    const notes: string[] = [];

    let currentSection = '';
    let currentLevel = 0;

    for (const line of text.split('\n')) {
      const headingMatch = line.match(/^##\s+(.+)/);
      if (headingMatch) {
        currentSection = headingMatch[1];
        currentLevel = 1;
        sections.push({ heading: currentSection, content: '', level: currentLevel });
        continue;
      }

      if (sections.length > 0) {
        const last = sections[sections.length - 1];
        last.content += (last.content ? '\n' : '') + line;
      }

      const sectionLower = currentSection.toLowerCase();

      if (sectionLower.match(/field|column|data.element|layout|record|segment|tag/)) {
        const extracted = this.extractFieldFromLine(line);
        if (extracted) {
          fields.push(extracted);
          continue;
        }
      }

      if (sectionLower.match(/format|delimiter|output|file.type|encoding/)) {
        for (const pat of FORMAT_PATTERNS) {
          if (pat.test(line)) {
            const match = line.match(pat);
            if (match) {
              const type = match[0].toLowerCase().replace(/[^a-z]/g, '');
              formats.push({
                type: DELIMITER_MAP[type] ? `delimited` : type,
                delimiter: DELIMITER_MAP[type],
              });
            }
            break;
          }
        }
      }

      if (sectionLower.match(/rule|validation|constraint|requirement|condition/)) {
        rules.push(line);
        continue;
      }

      if (line.match(/required|mandatory|optional|must|shall|should|note:|important/i)) {
        if (!fields.some(f => f.name && line.toLowerCase().includes(f.name.toLowerCase()))) {
          notes.push(line);
        }
      }
    }

    const tableResult = this.extractTableFromText(text);
    const existingNames = new Set(fields.map(f => f.name.toLowerCase()));
    for (const tf of tableResult.fields) {
      if (!existingNames.has(tf.name.toLowerCase())) {
        fields.push(tf);
        existingNames.add(tf.name.toLowerCase());
      }
    }

    const name = this.inferName(text);

    return { name, fields, formats, rules, notes, sections, sourceText: text, hasSubFields: tableResult.hasSubFields };
  }

  private extractFieldFromLine(line: string): ExtractedField | null {
    const rawParts = line.split('|').map(s => s.trim()).filter(Boolean);
    if (rawParts.length >= 3) {
      return null;
    }
    const tableSplit = rawParts;
    if (tableSplit.length >= 2) {
      const field: ExtractedField = { name: tableSplit[0] };
      for (let i = 1; i < tableSplit.length; i++) {
        const val = tableSplit[i].toLowerCase();
        if (TYPE_PATTERNS.some(p => p.test(val))) {
          field.dataType = tableSplit[i];
        } else if (val.match(/^(required|mandatory|yes|y|r)$/)) {
          field.required = true;
        } else if (val.match(/^(optional|no|n|o)$/)) {
          field.required = false;
        } else if (!field.description && tableSplit[i].length > 3) {
          field.description = tableSplit[i];
        }
      }
      if (field.name.replace(/[^a-z0-9]/gi, '').length > 0) {
        return field;
      }
    }

    const fieldMatch = line.match(/^[•\-*]\s*(.+?)\s*[-–—]\s*(.+)/);
    if (fieldMatch) {
      const name = fieldMatch[1].trim().split(/\s+/)[0].replace(/[^a-zA-Z0-9_]/g, '');
      if (name) {
        return { name, description: fieldMatch[2].trim() };
      }
    }

    return null;
  }

  private extractTableFromText(text: string): { fields: ExtractedField[]; hasSubFields: boolean } {
    const fields: ExtractedField[] = [];
    const lines = text.split('\n');
    let inTable = false;
    let headers: string[] = [];
    let nameCol = -1;
    let typeCol = -1;
    let reqCol = -1;
    let lenCol = -1;
    let descCol = -1;
    let posCol = -1;
    let defaultCol = -1;
    let subCol = -1;
    let repeatingCol = -1;
    let delimiterCol = -1;
    let hasSubFields = false;

    for (const line of lines) {
      if (line.includes('|') && line.split('|').filter(s => s.trim()).length >= 3) {
        const parts = line.split('|').map(s => s.replace(/\v/g, '|').trim());

        if (!inTable) {
          headers = parts;
          for (let i = 0; i < headers.length; i++) {
            const h = headers[i]
              .toLowerCase()
              .replace(/^[a-z]\s*\.\s+/, '')
              .replace(/^\d+\s*\.\s+/, '')
              .replace(/[^a-z0-9]/g, '')
              .replace(/^_+|_+$/g, '');
            if (nameCol === -1 && h.match(/^(dataelementname|dataelement|elementname|fieldname|columnname|name)$/)) nameCol = i;
            else if (typeCol === -1 && h.match(/^(datatype|type|data_type|fieldtype)$/)) typeCol = i;
            else if (reqCol === -1 && h.match(/^(required|req|mandatory|requirement|requiredync|requiredyn)/)) reqCol = i;
            else if (lenCol === -1 && h.match(/^(length|len|size|width|maxlength|fieldlength)$/)) lenCol = i;
            else if (descCol === -1 && h.match(/^(description|desc|definition|note|notes|comment|comments)$/)) descCol = i;
            else if (posCol === -1 && h.match(/^(position|pos|seq|order|seqnum|fieldnum|csvfield|fieldnumber|number|field)$/)) posCol = i;
            else if (subCol === -1 && h.match(/^(csvsubfield|subfield|subfieldnum|sub|component)$/)) subCol = i;
            else if (repeatingCol === -1 && h.match(/^(repeating|repeat|rep|repeatingyn)$/)) repeatingCol = i;
            else if (delimiterCol === -1 && h.match(/^(delimiter|delim|sep|separator)$/)) delimiterCol = i;
            else if (defaultCol === -1 && h.match(/^(default|defaultvalue)$/)) defaultCol = i;
          }
          if (nameCol === -1) {
            if (posCol >= 0 && posCol + 2 < headers.length) {
              nameCol = posCol + 2;
            } else {
              nameCol = 1;
            }
          }
          inTable = true;
          continue;
        }

        if (parts.length >= 2) {
          const field: ExtractedField = { name: parts[Math.min(nameCol, parts.length - 1)] };

          if (subCol >= 0 && subCol < parts.length && parts[subCol].trim()) {
            hasSubFields = true;
          }

          for (let i = 0; i < parts.length && i < headers.length; i++) {
            const val = parts[i];
            if (i === typeCol && typeCol >= 0) {
              field.dataType = val;
            } else if (i === reqCol && reqCol >= 0) {
              field.required = val.match(/^(y|yes|required|mandatory|r)$/i) ? true : false;
            } else if (i === lenCol && lenCol >= 0) {
              const num = parseInt(val, 10);
              if (!isNaN(num)) field.length = num;
            } else if (i === descCol && descCol >= 0) {
              field.description = val;
            } else if (i === posCol && posCol >= 0) {
              const num = parseInt(val, 10);
              if (!isNaN(num)) field.sourcePosition = num;
            } else if (i === defaultCol && defaultCol >= 0) {
              field.defaultValue = val;
            } else if (i === subCol && subCol >= 0) {
              const num = parseInt(val, 10);
              if (!isNaN(num)) field.subFieldPosition = num;
            } else if (i === repeatingCol && repeatingCol >= 0) {
              field.repeating = /^(y|yes|true|r|repeating)$/i.test(val);
            } else if (i === delimiterCol && delimiterCol >= 0) {
              field.delimiter = val.trim();
            }
          }

          const name = field.name.replace(/[^a-z0-9_]/gi, '_').replace(/^_+|_+$/g, '');
          if (name && name.length > 0) {
            field.name = name;
            fields.push(field);
          }
        }
      } else {
        inTable = false;
        headers = [];
        nameCol = -1; typeCol = -1; reqCol = -1; lenCol = -1; descCol = -1; posCol = -1; defaultCol = -1; subCol = -1; repeatingCol = -1; delimiterCol = -1;
      }
    }

    if (fields.length === 0) {
      for (const line of lines) {
        if (line.includes('|') && line.split('|').filter(s => s.trim()).length >= 3) {
          const parts = line.split('|').map(s => s.replace(/\v/g, '|').trim());
          if (!inTable) {
            inTable = true;
            continue;
          }
          if (parts.length >= 2) {
            const name = parts[Math.min(parts.length > 2 ? 2 : 1, parts.length - 1)];
            const cleanName = name.replace(/[^a-z0-9_]/gi, '_').replace(/^_+|_+$/g, '');
            if (cleanName && cleanName.length > 0 && !/^\d+$/.test(cleanName)) {
              fields.push({ name: cleanName });
            }
          }
        } else {
          inTable = false;
        }
      }
    }

    return { fields, hasSubFields };
  }

  private inferName(text: string): string {
    const lines = text.split('\n');
    for (const line of lines.slice(0, 10)) {
      const match = line.match(/(?:specification|spec|data.extract|interface|file.layout|output.layout)\s*(?:name|title|:)?\s*[:#]?\s*(.+)/i);
      if (match) return match[1].trim();
    }
    for (const line of lines.slice(0, 5)) {
      const clean = line.replace(/^##\s*/, '').trim();
      if (clean.length > 3 && clean.length < 120) return clean;
    }
    return 'Untitled Specification';
  }
}
