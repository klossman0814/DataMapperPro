import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SpecEvaluatorEngineService } from './spec-evaluator-engine.service';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

@Processor('spec-evaluation')
export class SpecEvaluatorProcessor {
  private readonly logger = new Logger(SpecEvaluatorProcessor.name);

  constructor(
    private prisma: PrismaService,
    private evaluatorEngine: SpecEvaluatorEngineService,
  ) {}

  @Process('evaluate')
  async handleEvaluate(job: Job<{ specDocumentId: string; evaluationId: string; uploadDir: string }>) {
    const { specDocumentId, evaluationId, uploadDir } = job.data;

    await this.prisma.specEvaluation.update({
      where: { id: evaluationId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      const spec = await this.prisma.specDocument.findUnique({
        where: { id: specDocumentId },
      });

      if (!spec) throw new Error('Spec document not found');
      if (!spec.extractedSpec) throw new Error('Spec document has no extracted spec data');

      const evaluation = await this.prisma.specEvaluation.findUnique({
        where: { id: evaluationId },
      });

      if (!evaluation) throw new Error('Evaluation not found');
      if (!evaluation.inputFilename) throw new Error('No input file associated with evaluation');

      const filePath = join(uploadDir, evaluation.inputFilename);
      if (!existsSync(filePath)) throw new Error(`Data file not found: ${filePath}`);

      const buffer = readFileSync(filePath);
      const extractedSpec = spec.extractedSpec as any;

      const result = this.evaluatorEngine.evaluateData(
        buffer,
        { fields: extractedSpec.fields || [] },
        extractedSpec.formats?.[0]?.type || 'csv',
        extractedSpec.formats?.[0]?.delimiter,
      );

      await this.prisma.specEvaluation.update({
        where: { id: evaluationId },
        data: {
          status: 'COMPLETED',
          score: result.score,
          fieldCoverage: JSON.parse(JSON.stringify(result.fieldCoverage)) as any,
          issues: JSON.parse(JSON.stringify(result.issues)) as any,
          summary: result.summary,
          inputRowCount: result.rowCount,
          completedAt: new Date(),
        },
      });

      this.logger.log(`Evaluation ${evaluationId} completed: score=${result.score}`);
    } catch (err: any) {
      this.logger.error(`Evaluation ${evaluationId} failed: ${err.message}`);

      await this.prisma.specEvaluation.update({
        where: { id: evaluationId },
        data: {
          status: 'FAILED',
          issues: JSON.parse(JSON.stringify([{ severity: 'error', message: err.message }])) as any,
          completedAt: new Date(),
        },
      });
    }
  }
}
