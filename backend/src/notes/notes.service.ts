import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, filters?: { category?: string; entityType?: string; entityId?: string }) {
    const where: any = { createdById: userId };
    if (filters?.category) where.category = filters.category;
    if (filters?.entityType) where.entityType = filters.entityType;
    if (filters?.entityId) where.entityId = filters.entityId;

    return this.prisma.note.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, createdById: userId },
    });
    if (!note) throw new NotFoundException('Note not found');
    return note;
  }

  async create(userId: string, dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category || 'general',
        entityId: dto.entityId || null,
        entityType: dto.entityType || null,
        createdById: userId,
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateNoteDto) {
    await this.findOne(id, userId);
    return this.prisma.note.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.entityId !== undefined && { entityId: dto.entityId || null }),
        ...(dto.entityType !== undefined && { entityType: dto.entityType || null }),
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.note.delete({ where: { id } });
    return { message: 'Note deleted successfully' };
  }
}
