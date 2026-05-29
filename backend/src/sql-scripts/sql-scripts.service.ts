import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createDecipheriv, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseQueryService } from '../database-connections/engine/database-query.service';
import { CreateScriptSetDto } from './dto/create-script-set.dto';
import { UpdateScriptSetDto } from './dto/update-script-set.dto';
import { ExecuteScriptsDto } from './dto/execute-scripts.dto';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'datamapper-default-change-me';

function decryptPassword(encrypted: string): string {
  const key = scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encryptedText, undefined, 'utf8') + decipher.final('utf8');
}

@Injectable()
export class SqlScriptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queryService: DatabaseQueryService,
  ) {}

  async create(userId: string, dto: CreateScriptSetDto) {
    const { steps, ...data } = dto;
    return this.prisma.sqlScriptSet.create({
      data: {
        ...data,
        createdById: userId,
        steps: {
          create: steps.map((s) => ({
            name: s.name,
            sql: s.sql,
            stepOrder: s.stepOrder,
            enabled: s.enabled ?? true,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    });
  }

  async findAll(userId: string) {
    return this.prisma.sqlScriptSet.findMany({
      where: { createdById: userId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        connection: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const set = await this.prisma.sqlScriptSet.findFirst({
      where: { id, createdById: userId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        connection: { select: { id: true, name: true, type: true } },
      },
    });
    if (!set) throw new NotFoundException('Script set not found');
    return set;
  }

  async update(id: string, userId: string, dto: UpdateScriptSetDto) {
    const existing = await this.findOne(id, userId);
    if (!existing) throw new NotFoundException('Script set not found');

    const { steps, ...data } = dto;

    if (steps) {
      // Delete all existing steps and recreate
      await this.prisma.sqlScriptStep.deleteMany({ where: { scriptSetId: id } });
      await this.prisma.sqlScriptStep.createMany({
        data: steps.map((s) => ({
          scriptSetId: id,
          name: s.name,
          sql: s.sql,
          stepOrder: s.stepOrder,
          enabled: s.enabled ?? true,
        })),
      });
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.sqlScriptSet.update({
        where: { id },
        data,
      });
    }

    return this.findOne(id, userId);
  }

  async remove(id: string, userId: string) {
    const existing = await this.findOne(id, userId);
    if (!existing) throw new NotFoundException('Script set not found');
    await this.prisma.sqlScriptSet.delete({ where: { id } });
    return { success: true };
  }

  async execute(userId: string, id: string, dto: ExecuteScriptsDto) {
    const scriptSet = await this.findOne(id, userId);
    if (!scriptSet) throw new NotFoundException('Script set not found');

    // Fetch the connection config
    const connection = await this.prisma.databaseConnection.findFirst({
      where: { id: dto.connectionId, createdById: userId },
    });
    if (!connection) throw new NotFoundException('Database connection not found');

    let steps = scriptSet.steps.filter((s) => s.enabled);
    const stepIdsFilter = dto.stepIds;
    if (stepIdsFilter && stepIdsFilter.length > 0) {
      steps = steps.filter((s) => stepIdsFilter.includes(s.id));
    }

    if (steps.length === 0) {
      throw new BadRequestException('No enabled steps to execute');
    }

    const password = decryptPassword(connection.encryptedPassword);
    const config = {
      host: connection.host,
      port: connection.port,
      database: connection.databaseName,
      username: connection.username,
      password,
      ssl: connection.sslEnabled ?? false,
    };

    const results: Array<{
      stepId: string;
      stepName: string;
      stepOrder: number;
      success: boolean;
      durationMs: number;
      rowsAffected?: number;
      error?: string;
    }> = [];

    for (const step of steps) {
      const start = Date.now();
      try {
        const execResult = await this.queryService.executeQuery(
          connection.type,
          config,
          step.sql,
        );
        results.push({
          stepId: step.id,
          stepName: step.name,
          stepOrder: step.stepOrder,
          success: true,
          durationMs: Date.now() - start,
          rowsAffected: execResult.rowCount ?? 0,
        });
      } catch (err: any) {
        results.push({
          stepId: step.id,
          stepName: step.name,
          stepOrder: step.stepOrder,
          success: false,
          durationMs: Date.now() - start,
          error: err.message || 'Unknown error',
        });
        // Stop execution on failure (fail-fast)
        break;
      }
    }

    return {
      scriptSetId: id,
      scriptSetName: scriptSet.name,
      connectionId: dto.connectionId,
      totalSteps: steps.length,
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}
