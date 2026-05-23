import { Injectable, Logger } from '@nestjs/common';

interface AiEnhancedField {
  name: string;
  dataType?: string;
  length?: number;
  required?: boolean;
  description?: string;
  sourcePosition?: number;
  defaultValue?: string;
  validation?: string;
  hl7Segment?: string;
  hl7Field?: number;
  hl7Component?: number;
}

interface AiEnhancedSpec {
  name: string;
  fields: AiEnhancedField[];
  formats: { type: string; delimiter?: string; headerRow?: boolean; encoding?: string }[];
  rules: string[];
  notes: string[];
  provider?: string;
  version?: string;
}

@Injectable()
export class AiParserService {
  private readonly logger = new Logger(AiParserService.name);

  async enhance(sourceText: string, ruleBasedSpec: any): Promise<AiEnhancedSpec> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      this.logger.log('OPENAI_API_KEY not set — skipping AI enhancement');
      return { ...ruleBasedSpec, fields: ruleBasedSpec.fields || [] };
    }

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const prompt = `You are a healthcare data specification parser. Analyze the following document text and extract structured specification data.

Document text:
${sourceText.slice(0, 8000)}

Current rule-based extraction (use as starting point, improve where possible):
${JSON.stringify(ruleBasedSpec, null, 2)}

Return ONLY valid JSON with this exact structure:
{
  "name": "specification name",
  "provider": "source system name if identifiable",
  "version": "version if found",
  "fields": [
    {
      "name": "field_name",
      "dataType": "inferred data type",
      "length": null or number,
      "required": true/false,
      "description": "description",
      "sourcePosition": null or number,
      "defaultValue": null or string,
      "validation": "regex or rule if present",
      "hl7Segment": "MSH/PID/OBX/etc if HL7-related",
      "hl7Field": null or number,
      "hl7Component": null or number
    }
  ],
  "formats": [{"type": "csv|pipe|fixedwidth|hl7|json|xml", "delimiter": null or string}],
  "rules": ["rule1", "rule2"],
  "notes": ["note1", "note2"]
}`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a precise data specification parser. Return ONLY valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const content = response.choices[0]?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('AI response did not contain valid JSON — using rule-based result');
        return { ...ruleBasedSpec, fields: ruleBasedSpec.fields || [] };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        name: parsed.name || ruleBasedSpec.name,
        fields: Array.isArray(parsed.fields) ? parsed.fields : ruleBasedSpec.fields || [],
        formats: Array.isArray(parsed.formats) ? parsed.formats : ruleBasedSpec.formats || [],
        rules: Array.isArray(parsed.rules) ? parsed.rules : ruleBasedSpec.rules || [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : ruleBasedSpec.notes || [],
        provider: parsed.provider,
        version: parsed.version,
      };
    } catch (err: any) {
      this.logger.error(`AI enhancement failed: ${err.message}`);
      return { ...ruleBasedSpec, fields: ruleBasedSpec.fields || [] };
    }
  }
}
