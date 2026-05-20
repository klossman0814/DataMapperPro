import { Injectable } from '@nestjs/common';
import { TransformationEngineService } from './engine/transformation-engine.service';

@Injectable()
export class TransformationsService {
  constructor(private engine: TransformationEngineService) {}

  transform(expression: string, row: Record<string, any>): any {
    return this.engine.apply(expression, row);
  }

  transformRow(mappings: { destination: string; expression: string }[], row: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const mapping of mappings) {
      result[mapping.destination] = this.engine.apply(mapping.expression, row);
    }
    return result;
  }
}
