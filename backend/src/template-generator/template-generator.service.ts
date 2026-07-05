import { Injectable, Logger, BadRequestException } from '@nestjs/common';

@Injectable()
export class TemplateGeneratorService {
  private readonly logger = new Logger(TemplateGeneratorService.name);

  async generate(sampleOutput: string): Promise<{ template: string }> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException('OpenAI API key not configured. Set OPENAI_API_KEY environment variable.');
    }

    const lines = sampleOutput.split('\n').slice(0, 50);
    const truncated = lines.join('\n');

    try {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey });

      const systemPrompt = `You are a template generator for DataMapper Pro's template engine. Given a sample of the desired output extract, analyze its structure and generate a template that would produce it.

TEMPLATE SYNTAX:
- {{fieldName}} or {{row.fieldName}} — insert a field value
- {{#if fieldName}}...{{/if}} — conditional block (include lines only if fieldName is truthy)
- {{#if fieldName}}...{{else}}...{{/if}} — conditional with else branch
- {{#each listField}}...item fields...{{/each}} — iterate over an array (the inner content is repeated for each item, referencing item properties directly)
- {{crlf}} — carriage return + line feed (\\r\\n)
- {{sequence(N)}} — auto-incrementing row number padded to N digits
- {{sequence(N, prefix, suffix)}} — sequence with prefix and suffix

TRANSFORMATION FUNCTIONS (can be used inline: {{fn(args)}}):
- {{trim(field)}} — remove leading/trailing whitespace
- {{upper(field)}} — convert to uppercase
- {{lower(field)}} — convert to lowercase
- {{substring(field, start, end?)}} — extract substring
- {{replace(field, search, replacement)}} — string replacement
- {{padStart(field, len, 'char')}} — left-pad to length
- {{padEnd(field, len, 'char')}} — right-pad to length
- {{concat(field1, 'literal', field2)}} — concatenate values
- {{formatDate(field, 'pattern')}} — format date (yyyyMMdd, etc.)
- {{parseDate(field)}} — parse to ISO date
- {{round(field, decimals?)}} — round number
- {{formatNumber(field, '0,0.00')}} — format number
- {{parseInt(field)}}, {{parseFloat(field)}} — parse to number
- {{coalesce(field1, field2, 'default')}} — first non-null value
- {{if(condition, trueVal, falseVal)}} — conditional value
- {{case(value, match1, out1, ..., default?)}} — pattern matching
- {{switch(value, object, default?)}} — object lookup
- {{join(separator, field1, field2, ...)}} — join values

INSTRUCTIONS:
Analyze the sample output to infer:
1. The delimiter structure (pipes, commas, tildes, tabs, etc.)
2. Which fields are always present vs. conditionally present
3. Any computed or transformed fields
4. Row numbering pattern
5. Multi-line records and grouping
6. Placeholder field names where the data suggests them

Return ONLY the template content. No explanations, no markdown formatting, no code fences.`;

      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a DataMapper Pro template that produces this output extract:\n\n${truncated}` },
        ],
        temperature: 0.3,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content?.trim() || '';
      if (!content) {
        throw new Error('AI returned empty response');
      }

      return { template: content };
    } catch (err: any) {
      this.logger.error(`Template generation failed: ${err.message}`);
      throw new BadRequestException(`Template generation failed: ${err.message}`);
    }
  }
}