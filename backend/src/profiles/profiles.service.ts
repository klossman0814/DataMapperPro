import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfilesService {
  constructor(private prisma: PrismaService) {}

  async save(data: {
    name: string;
    description?: string;
    template: string;
    configurationJson: any;
    id?: string;
  }, userId: string) {
    if (data.id) {
      const existing = await this.prisma.mappingProfile.findUnique({ where: { id: data.id } });
      if (!existing) {
        throw new NotFoundException('Profile not found');
      }
      return this.prisma.mappingProfile.update({
        where: { id: data.id },
        data: {
          name: data.name,
          description: data.description,
          template: data.template,
          configurationJson: JSON.parse(JSON.stringify(data.configurationJson)) as Prisma.InputJsonValue,
          version: existing.version + 1,
        },
      });
    }

    return this.prisma.mappingProfile.create({
      data: {
        name: data.name,
        description: data.description,
        template: data.template,
        configurationJson: JSON.parse(JSON.stringify(data.configurationJson)) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }

  async list(userId: string, search?: string, page: number = 1, limit: number = 20) {
    const where: any = { createdById: userId };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [profiles, total] = await Promise.all([
      this.prisma.mappingProfile.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mappingProfile.count({ where }),
    ]);

    return {
      data: profiles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async get(id: string) {
    const profile = await this.prisma.mappingProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Profile not found');
    }
    return profile;
  }

  async delete(id: string) {
    await this.get(id);
    await this.prisma.mappingProfile.delete({ where: { id } });
  }

  async clone(id: string) {
    const profile = await this.get(id);
    return this.prisma.mappingProfile.create({
      data: {
        name: `${profile.name} (Copy)`,
        description: profile.description,
        template: profile.template,
        configurationJson: profile.configurationJson as Prisma.InputJsonValue,
        createdById: profile.createdById,
      },
    });
  }

  async exportProfile(id: string) {
    const profile = await this.get(id);
    return {
      name: profile.name,
      description: profile.description,
      template: profile.template,
      configurationJson: profile.configurationJson,
      version: profile.version,
      exportedAt: new Date().toISOString(),
    };
  }

  async importProfile(json: {
    name: string;
    description?: string;
    template: string;
    configurationJson: any;
  }, userId: string) {
    return this.prisma.mappingProfile.create({
      data: {
        name: json.name,
        description: json.description,
        template: json.template,
        configurationJson: JSON.parse(JSON.stringify(json.configurationJson)) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }
}
