import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMappingDto } from './dto/create-mapping.dto';

@Injectable()
export class MappingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMappingDto, userId: string) {
    return this.prisma.mappingProfile.create({
      data: {
        name: dto.name,
        description: dto.description,
        template: dto.template,
        configurationJson: JSON.parse(JSON.stringify(dto.mappings)) as Prisma.InputJsonValue,
        createdById: userId,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.mappingProfile.findMany({
      where: { createdById: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const profile = await this.prisma.mappingProfile.findUnique({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Mapping profile not found');
    }
    return profile;
  }

  async update(id: string, dto: Partial<CreateMappingDto>) {
    const profile = await this.findOne(id);
    return this.prisma.mappingProfile.update({
      where: { id },
      data: {
        name: dto.name ?? profile.name,
        description: dto.description ?? profile.description,
        template: dto.template ?? profile.template,
        configurationJson: dto.mappings
          ? JSON.parse(JSON.stringify(dto.mappings)) as Prisma.InputJsonValue
          : profile.configurationJson as Prisma.InputJsonValue,
        version: profile.version + 1,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    await this.prisma.mappingProfile.delete({ where: { id } });
  }

  async clone(id: string) {
    const profile = await this.findOne(id);
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
}
