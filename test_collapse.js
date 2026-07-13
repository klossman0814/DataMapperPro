const { TemplateEngineService } = require('./backend/dist/src/templates/engine/template-engine.service.js');

const template = [
  '{{sequence(3)}},{{account_number}}|CommWx|MRN{{crlf}}',
  '~{{mrn}}|Medent|MRN~{{crlf}}',
  '{{soarian_id}}|Soarian|MRN~'
].join('\n');

const ts = new TemplateEngineService({ apply: function(e, r) {
  const match = e.match(/^(\w+)\((.+)\)$/);
  if (!match) return '';
  const fn = match[1].toLowerCase();
  const args = match[2].split(',').map(s => s.trim().replace(/^['\u0022]|['\u0022]$/g, ''));
  if (fn === 'sequence') return String(r.index || 1).padStart(parseInt(args[0]) || 3, '0');
  return '';
}});

const row1 = { account_number: '2000000002', mrn: '2', soarian_id: '65098' };
const row2 = { account_number: '2000000004', mrn: '4', soarian_id: '17245' };

console.log('=== WITH COLLAPSE ===');
console.log(JSON.stringify(ts.processTemplate(template, row1, [], 1, true)));
console.log(JSON.stringify(ts.processTemplate(template, row2, [], 2, true)));

console.log('=== WITHOUT COLLAPSE ===');
console.log(JSON.stringify(ts.processTemplate(template, row1, [], 1, false)));
console.log(JSON.stringify(ts.processTemplate(template, row2, [], 2, false)));
