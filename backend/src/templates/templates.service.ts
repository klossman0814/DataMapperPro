import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TemplateEngineService } from './engine/template-engine.service';
import { RenderInlineDto } from './dto/render-inline.dto';

@Injectable()
export class TemplatesService {
  constructor(
    private prisma: PrismaService,
    private templateEngine: TemplateEngineService,
  ) {}

  async renderInline(dto: RenderInlineDto) {
    const row = dto.context?.row || {};
    const index = dto.context?.index ?? 1;
    const output = this.templateEngine.renderPreview(dto.template, row, index);
    return { output };
  }

  async findAll(userId: string) {
    const profiles = await this.prisma.mappingProfile.findMany({
      where: { createdById: userId },
      select: {
        id: true,
        name: true,
        description: true,
        template: true,
        version: true,
        configurationJson: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: profiles.map(p => ({ ...p, configurationJson: p.configurationJson as any, content: p.template })) };
  }

  async findOne(id: string) {
    const profile = await this.prisma.mappingProfile.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        template: true,
        version: true,
        configurationJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!profile) {
      throw new NotFoundException('Template not found');
    }
    return { ...profile, configurationJson: profile.configurationJson as any, content: profile.template };
  }

  async create(body: { name: string; template: string; description?: string; configuration?: any }, userId: string) {
    const config = { mappings: [], ...body.configuration };
    const profile = await this.prisma.mappingProfile.create({
      data: {
        name: body.name,
        description: body.description,
        template: body.template,
        configurationJson: JSON.parse(JSON.stringify(config)) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
    return { ...profile, configurationJson: profile.configurationJson as any, content: profile.template };
  }

  async update(id: string, body: { name?: string; template?: string; description?: string; configuration?: any }) {
    const existing = await this.prisma.mappingProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }
    const existingConfig = (existing.configurationJson as any) || {};
    const mergedConfig = body.configuration
      ? { ...existingConfig, ...body.configuration }
      : existingConfig;
    const profile = await this.prisma.mappingProfile.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        template: body.template ?? existing.template,
        description: body.description ?? existing.description,
        configurationJson: JSON.parse(JSON.stringify(mergedConfig)) as Prisma.InputJsonValue,
        version: existing.version + 1,
      },
    });
    return { ...profile, configurationJson: profile.configurationJson as any, content: profile.template };
  }

  async delete(id: string) {
    const existing = await this.prisma.mappingProfile.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Template not found');
    }
    await this.prisma.mappingProfile.delete({ where: { id } });
    return { deleted: true };
  }

  async render(id: string, context: Record<string, any>) {
    const profile = await this.prisma.mappingProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Template not found');
    }
    const row = context.row || {};
    const index = context.index ?? 0;
    const mappings = (profile.configurationJson as any)?.mappings || [];
    const output = this.templateEngine.processTemplate(profile.template, row, mappings, index);
    return { output };
  }
}
