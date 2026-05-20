import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FileProcessorService } from './processors/file-processor.service';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class JobsService {
  constructor(
    private prisma: PrismaService,
    private fileProcessor: FileProcessorService,
  ) {}

  async create(dto: CreateJobDto, userId: string) {
    const config = {
      ...(dto.outputOptions || {}),
      mappings: dto.mappings || [],
      template: dto.template || '',
    };
    const job = await this.prisma.processingJob.create({
      data: {
        status: 'PENDING',
        config: JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue,
        outputFormat: dto.outputFormat,
        uploadedFileId: dto.fileId,
        profileId: dto.profileId,
        createdById: userId,
      },
    });

    this.startProcessing(job.id).catch((err) => {
      console.error(`Job ${job.id} processing failed:`, err.message);
    });

    return job;
  }

  async startProcessing(jobId: string) {
    await this.fileProcessor.processJob(jobId);
  }

  async findAll(
    userId: string,
    filters: { status?: string; page?: number; limit?: number },
  ) {
    const where: any = { createdById: userId };
    if (filters.status) {
      where.status = filters.status;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;

    const [jobs, total] = await Promise.all([
      this.prisma.processingJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          uploadedFile: { select: { id: true, originalName: true } },
          profile: { select: { id: true, name: true } },
        },
      }),
      this.prisma.processingJob.count({ where }),
    ]);

    return {
      data: jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const job = await this.prisma.processingJob.findUnique({
      where: { id },
      include: {
        uploadedFile: true,
        profile: true,
      },
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async getProgress(id: string) {
    const job = await this.findOne(id);
    const total = job.totalRows || 1;
    return {
      id: job.id,
      status: job.status,
      totalRows: job.totalRows,
      processedRows: job.processedRows,
      failedRows: job.failedRows,
      progress: Math.round(((job.processedRows + job.failedRows) / total) * 100),
    };
  }

  async cancel(id: string) {
    const job = await this.findOne(id);
    if (job.status === 'PENDING' || job.status === 'PROCESSING') {
      return this.prisma.processingJob.update({
        where: { id },
        data: { status: 'FAILED', completedAt: new Date() },
      });
    }
    return job;
  }

  async getOutput(id: string) {
    const job = await this.findOne(id);
    if (!job.outputFile) {
      throw new NotFoundException('No output file available');
    }
    return job.outputFile;
  }

  async getErrors(id: string) {
    const job = await this.findOne(id);
    return job.errorLog || [];
  }
}
