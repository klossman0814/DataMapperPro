import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

const SUPER_ADMIN_EMAIL = 'admin@datamapperpro.com';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(search?: string, page: number = 1, limit: number = 50) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          menuPermissions: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              mappingProfiles: true,
              uploadedFiles: true,
              processingJobs: true,
              databaseConnections: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        menuPermissions: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            mappingProfiles: true,
            uploadedFiles: true,
            processingJobs: true,
            databaseConnections: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email === SUPER_ADMIN_EMAIL) {
      throw new BadRequestException('Cannot modify the super admin account');
    }

    if (dto.email && dto.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.menuPermissions !== undefined) {
      data.menuPermissions = JSON.parse(JSON.stringify(dto.menuPermissions)) as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        menuPermissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async deactivateUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email === SUPER_ADMIN_EMAIL) {
      throw new BadRequestException('Cannot deactivate the super admin account');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}
