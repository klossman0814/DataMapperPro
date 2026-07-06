import type { MappingProfile } from '../types';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatLabel(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function condText(m: { condition?: { field: string; operator: string; value?: string } }): string {
  if (!m.condition) return '\u2014';
  return `${m.condition.field} ${m.condition.operator}${m.condition.value ? ` ${m.condition.value}` : ''}`;
}

export function generateReportHtml(profile: MappingProfile): string {
  const { configurationJson } = profile;
  const mappings = configurationJson?.mappings || [];
  const outputFormat = (configurationJson?.outputFormat || 'csv').toUpperCase();
  const outputOptions = configurationJson?.outputOptions || {};
  const transformsCount = mappings.filter(m => m.transformation).length;
  const conditionsCount = mappings.filter(m => m.condition).length;
  const generatedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const summaryCards = [
    { label: 'Field Mappings', value: mappings.length.toString() },
    { label: 'Output Format', value: outputFormat },
    { label: 'Transformations', value: transformsCount.toString() },
    { label: 'Conditions', value: conditionsCount.toString() },
  ];

  const optionRows = Object.entries(outputOptions)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([key, val]) => `<tr><td class="key">${formatLabel(key)}</td><td>${String(val)}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Profile Report \u2014 ${profile.name}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: #f3f4f6;
    color: #111827;
    line-height: 1.5;
    padding: 40px 24px;
  }
  .container {
    max-width: 1000px;
    margin: 0 auto;
  }
  .report {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.06);
    overflow: hidden;
  }
  .header {
    padding: 32px 36px 24px;
    border-bottom: 1px solid #e5e7eb;
  }
  .header .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: #7c3aed;
    margin-bottom: 8px;
  }
  .header h1 {
    font-size: 24px;
    font-weight: 700;
    color: #111827;
  }
  .header .desc {
    margin-top: 4px;
    font-size: 14px;
    color: #6b7280;
  }
  .header .meta {
    margin-top: 10px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px 20px;
    font-size: 12px;
    color: #6b7280;
  }
  .header .meta strong { color: #374151; }

  .summary {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 24px 36px;
  }
  .summary-card {
    text-align: center;
    padding: 16px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
  }
  .summary-card .value {
    font-size: 26px;
    font-weight: 700;
    color: #111827;
  }
  .summary-card .label {
    margin-top: 2px;
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: .04em;
  }

  .section {
    padding: 0 36px 32px;
  }
  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 12px;
    margin-top: 28px;
  }
  .section-title:first-child { margin-top: 0; }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
  }
  thead { background: #f9fafb; }
  th {
    padding: 8px 10px;
    font-weight: 600;
    color: #6b7280;
    text-align: left;
    white-space: nowrap;
  }
  td {
    padding: 7px 10px;
    color: #374151;
    border-top: 1px solid #e5e7eb;
  }
  td.num { color: #9ca3af; width: 1px; }
  td.mono { font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace; }
  td.amber { color: #b45309; }
  td.purple { color: #7c3aed; font-weight: 500; }
  td.dim { color: #d1d5db; }
  tr:hover td { background: #f9fafb; }

  .template-block {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #f9fafb;
    padding: 16px 20px;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    color: #1f2937;
    white-space: pre-wrap;
    word-break: break-all;
    line-height: 1.6;
  }

  .config-table td.key {
    width: 180px;
    font-weight: 500;
    color: #6b7280;
    font-size: 12px;
    padding: 9px 14px;
    background: #f9fafb;
  }
  .config-table td {
    padding: 9px 14px;
    font-size: 12px;
    color: #111827;
  }

  .footer {
    padding: 16px 36px;
    text-align: center;
    font-size: 10px;
    color: #9ca3af;
    border-top: 1px solid #e5e7eb;
  }

  @media (max-width: 640px) {
    body { padding: 16px 12px; }
    .header, .section { padding-left: 20px; padding-right: 20px; }
    .summary { grid-template-columns: repeat(2, 1fr); padding-left: 20px; padding-right: 20px; }
    table { font-size: 11px; }
    .config-table td.key { width: 100px; }
  }

  @media print {
    body { background: #fff; padding: 0; }
    .report { box-shadow: none; border-radius: 0; }
    @page { margin: 0.6in; }
  }
</style>
</head>
<body>
<div class="container">
<div class="report">

  <div class="header">
    <div class="badge">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
      Profile Report
    </div>
    <h1>${profile.name}</h1>
    ${profile.description ? `<p class="desc">${profile.description}</p>` : ''}
    <div class="meta">
      <span>Version <strong>${profile.version}</strong></span>
      <span>Created: ${formatDate(profile.createdAt)}</span>
      <span>Updated: ${formatDate(profile.updatedAt)}</span>
    </div>
  </div>

  <div class="summary">
    ${summaryCards.map(c => `
    <div class="summary-card">
      <div class="value">${c.value}</div>
      <div class="label">${c.label}</div>
    </div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
      Field Mappings
    </div>
    ${mappings.length === 0
      ? '<p style="color:#9ca3af;font-style:italic;font-size:13px">No mappings configured</p>'
      : `<table>
        <thead><tr>
          <th>#</th>
          <th>Destination Field</th>
          <th>Source Field</th>
          <th>Transformation</th>
          <th>Expression / Constant</th>
          <th>Condition</th>
        </tr></thead>
        <tbody>
          ${mappings.map((m, i) => `
          <tr>
            <td class="num">${i + 1}</td>
            <td class="mono" style="font-weight:600;color:#111827">${m.destinationField}</td>
            <td class="mono">${m.sourceField || '<span class="dim">\u2014</span>'}</td>
            <td class="mono">${m.transformation || '<span class="dim">\u2014</span>'}</td>
            <td class="mono">${(m.expression || m.constant) ? `<span class="amber">${m.expression || m.constant}</span>` : '<span class="dim">\u2014</span>'}</td>
            <td>${m.condition ? `<span class="purple">${condText(m)}</span>` : '<span class="dim">\u2014</span>'}</td>
          </tr>`).join('')}
        </tbody>
      </table>`}
  </div>

  ${profile.template ? `
  <div class="section">
    <div class="section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
      Output Template
    </div>
    <div class="template-block">${profile.template}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      Configuration
    </div>
    <table class="config-table">
      <tr><td class="key">Output Format</td><td style="font-weight:600">${outputFormat}</td></tr>
      ${optionRows}
    </table>
  </div>

  <div class="footer">
    Report generated on ${generatedAt}
  </div>

</div>
</div>
</body>
</html>`;
}
