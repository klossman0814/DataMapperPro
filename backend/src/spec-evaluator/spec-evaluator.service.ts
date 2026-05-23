import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { SpecParserService } from './engine/spec-parser.service';
import { AiParserService } from './engine/ai-parser.service';
import { SpecEvaluatorEngineService } from './engine/spec-evaluator-engine.service';
import { UploadSpecDto } from './dto/upload-spec.dto';
import { v4 as uuid } from 'uuid';
import { join } from 'path';
import { writeFile, readFileSync, existsSync, mkdirSync } from 'fs';
import { Prisma } from '@prisma/client';

@Injectable()
export class SpecEvaluatorService {
  private uploadDir = join(process.cwd(), 'uploads', 'specs');
  private dataDir = join(process.cwd(), 'uploads', 'spec-evaluations');

  constructor(
    private prisma: PrismaService,
    private specParser: SpecParserService,
    private aiParser: AiParserService,
    private evaluatorEngine: SpecEvaluatorEngineService,
    @InjectQueue('spec-evaluation') private evaluationQueue: Queue,
  ) {
    if (!existsSync(this.uploadDir)) mkdirSync(this.uploadDir, { recursive: true });
    if (!existsSync(this.dataDir)) mkdirSync(this.dataDir, { recursive: true });
  }

  async upload(file: Express.Multer.File, dto: UploadSpecDto, userId: string) {
    const ext = file.originalname.toLowerCase().split('.').pop() || '';
    const supported = ['docx', 'xlsx', 'xls', 'pdf', 'txt', 'csv', 'tsv', 'dat', 'hl7'];
    if (!supported.includes(ext)) {
      throw new BadRequestException(`Unsupported file type: .${ext}`);
    }

    const filename = `${uuid()}.${ext}`;
    const filePath = join(this.uploadDir, filename);
    await writeFile(filePath, file.buffer, () => {});

    const parsed = await this.specParser.parse(file, file.originalname);
    const enhanced = await this.aiParser.enhance(parsed.sourceText || '', parsed);

    const record = await this.prisma.specDocument.create({
      data: {
        name: dto.name || enhanced.name || file.originalname,
        description: dto.description || null,
        filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        sourceText: parsed.sections.map(s => `${s.heading}\n${s.content}`).join('\n').slice(0, 50000) || null,
        extractedSpec: JSON.parse(JSON.stringify(enhanced)) as Prisma.InputJsonValue,
        sections: JSON.parse(JSON.stringify(parsed.sections)) as Prisma.InputJsonValue,
        tags: dto.tags || null,
        provider: (enhanced as any).provider || null,
        status: 'PARSED',
        createdById: userId,
      },
    });

    return this.formatSpecResponse(record);
  }

  async findAll(userId: string, page = 1, limit = 20, tag?: string) {
    const where: any = { createdById: userId };
    if (tag) {
      where.tags = { contains: tag };
    }

    const [items, total] = await Promise.all([
      this.prisma.specDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.specDocument.count({ where }),
    ]);

    return {
      data: items.map(item => this.formatSpecResponse(item)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string) {
    const record = await this.prisma.specDocument.findFirst({
      where: { id, createdById: userId },
      include: { evaluations: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (!record) throw new NotFoundException('Spec document not found');
    return this.formatSpecResponse(record);
  }

  async delete(id: string, userId: string) {
    const record = await this.prisma.specDocument.findFirst({
      where: { id, createdById: userId },
    });
    if (!record) throw new NotFoundException('Spec document not found');

    await this.prisma.specEvaluation.deleteMany({ where: { specDocumentId: id } });
    await this.prisma.specDocument.delete({ where: { id } });

    const filePath = join(this.uploadDir, record.filename);
    if (existsSync(filePath)) {
      try { const fs = await import('fs'); fs.unlinkSync(filePath); } catch {}
    }

    return { deleted: true };
  }

  async startEvaluation(specId: string, file: Express.Multer.File, userId: string) {
    const spec = await this.prisma.specDocument.findFirst({
      where: { id: specId, createdById: userId },
    });
    if (!spec) throw new NotFoundException('Spec document not found');

    const dataFilename = `${uuid()}_${file.originalname}`;
    const dataPath = join(this.dataDir, dataFilename);
    await writeFile(dataPath, file.buffer, () => {});

    const evaluation = await this.prisma.specEvaluation.create({
      data: {
        specDocumentId: specId,
        evaluatedById: userId,
        status: 'PENDING',
        inputFilename: dataFilename,
      },
    });

    await this.evaluationQueue.add('evaluate', {
      specDocumentId: specId,
      evaluationId: evaluation.id,
      uploadDir: this.dataDir,
    });

    return { id: evaluation.id, status: 'PENDING' };
  }

  async getEvaluation(evalId: string, userId: string) {
    const evaluation = await this.prisma.specEvaluation.findFirst({
      where: { id: evalId, evaluatedById: userId },
      include: { specDocument: true },
    });
    if (!evaluation) throw new NotFoundException('Evaluation not found');
    return evaluation;
  }

  async listEvaluations(specId: string, userId: string) {
    const spec = await this.prisma.specDocument.findFirst({
      where: { id: specId, createdById: userId },
    });
    if (!spec) throw new NotFoundException('Spec document not found');

    return this.prisma.specEvaluation.findMany({
      where: { specDocumentId: specId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async createMappingProfile(specId: string, userId: string) {
    const spec = await this.prisma.specDocument.findFirst({
      where: { id: specId, createdById: userId },
    });
    if (!spec) throw new NotFoundException('Spec document not found');

    const extracted = spec.extractedSpec as any;
    const fields = extracted?.fields || [];

    if (fields.length === 0) {
      throw new BadRequestException('No fields found in spec to create a mapping profile');
    }

    const mappings = fields.map((f: any) => ({
      destinationField: f.name,
      sourceField: '',
      constant: '',
      expression: '',
      transformation: '',
      condition: null as any,
    }));

    const profile = await this.prisma.mappingProfile.create({
      data: {
        name: `${spec.name} — Auto-generated`,
        description: `Auto-generated from spec document: ${spec.originalName}`,
        template: '',
        configurationJson: JSON.parse(JSON.stringify({
          mappings,
          outputFormat: 'csv',
          outputOptions: {},
        })) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });

    return profile;
  }

  private formatSpecResponse(record: any) {
    const extracted = record.extractedSpec as any;
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      originalName: record.originalName,
      mimeType: record.mimeType,
      size: record.size,
      tags: record.tags,
      provider: record.provider,
      status: record.status,
      version: record.version,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      fieldCount: extracted?.fields?.length || 0,
      formatCount: extracted?.formats?.length || 0,
      fields: extracted?.fields || [],
      formats: extracted?.formats || [],
      rules: extracted?.rules || [],
      notes: extracted?.notes || [],
      sections: record.sections,
      ...(record.evaluations ? { evaluations: record.evaluations } : {}),
    };
  }
}
