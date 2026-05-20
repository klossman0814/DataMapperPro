import { Injectable } from '@nestjs/common';

@Injectable()
export class XmlExportService {
  export(rows: Record<string, any>[], options?: { rootElement?: string; itemElement?: string }): string {
    const root = options?.rootElement || 'root';
    const item = options?.itemElement || 'record';

    const escapeXml = (str: any): string => {
      const s = String(str);
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    };

    const items = rows.map(row => {
      const fields = Object.entries(row)
        .map(([key, val]) => `    <${key}>${escapeXml(val)}</${key}>`)
        .join('\n');
      return `  <${item}>\n${fields}\n  </${item}>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<${root}>\n${items}\n</${root}>\n`;
  }
}
