import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseQueryService, QueryResult } from './engine/database-query.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'datamapper-default-change-me';

function encrypt(text: string): string {
  const key = scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encrypted: string): string {
  const key = scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = Buffer.from(parts[2], 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encryptedText as any, 'hex', 'utf8') + decipher.final('utf8');
}

@Injectable()
export class DatabaseConnectionsService {
  constructor(
    private prisma: PrismaService,
    private queryService: DatabaseQueryService,
  ) {}

  async create(dto: CreateConnectionDto, userId: string) {
    return this.prisma.databaseConnection.create({
      data: {
        name: dto.name,
        type: dto.type,
        host: dto.host,
        port: dto.port,
        databaseName: dto.databaseName,
        username: dto.username,
        encryptedPassword: encrypt(dto.password),
        sslEnabled: dto.sslEnabled ?? false,
        createdById: userId,
      },
      select: { id: true, name: true, type: true, host: true, port: true, databaseName: true, username: true, sslEnabled: true, createdAt: true, updatedAt: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.databaseConnection.findMany({
      where: { createdById: userId },
      select: { id: true, name: true, type: true, host: true, port: true, databaseName: true, username: true, sslEnabled: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id, createdById: userId },
      select: { id: true, name: true, type: true, host: true, port: true, databaseName: true, username: true, sslEnabled: true, createdAt: true, updatedAt: true },
    });
    if (!conn) throw new NotFoundException('Database connection not found');
    return conn;
  }

  async update(id: string, dto: UpdateConnectionDto, userId: string) {
    const existing = await this.findOne(id, userId);
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.host !== undefined) data.host = dto.host;
    if (dto.port !== undefined) data.port = dto.port;
    if (dto.databaseName !== undefined) data.databaseName = dto.databaseName;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.password !== undefined) data.encryptedPassword = encrypt(dto.password);
    if (dto.sslEnabled !== undefined) data.sslEnabled = dto.sslEnabled;

    return this.prisma.databaseConnection.update({
      where: { id },
      data,
      select: { id: true, name: true, type: true, host: true, port: true, databaseName: true, username: true, sslEnabled: true, createdAt: true, updatedAt: true },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.databaseConnection.delete({ where: { id } });
    return { deleted: true };
  }

  async testConnection(id: string, userId: string) {
    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id, createdById: userId },
    });
    if (!conn) throw new NotFoundException('Database connection not found');

    const password = decrypt(conn.encryptedPassword);
    try {
      await this.queryService.executeQuery(
        conn.type,
        { host: conn.host, port: conn.port, database: conn.databaseName, username: conn.username, password, ssl: conn.sslEnabled },
        'SELECT 1 AS ok',
      );
      return { success: true, message: 'Connection successful' };
    } catch (err: any) {
      throw new BadRequestException(`Connection failed: ${err.message}`);
    }
  }

  async executeQuery(id: string, sql: string, userId: string): Promise<QueryResult> {
    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id, createdById: userId },
    });
    if (!conn) throw new NotFoundException('Database connection not found');

    const password = decrypt(conn.encryptedPassword);
    try {
      return await this.queryService.executeQuery(
        conn.type,
        { host: conn.host, port: conn.port, database: conn.databaseName, username: conn.username, password, ssl: conn.sslEnabled },
        sql,
      );
    } catch (err: any) {
      throw new BadRequestException(`Query failed: ${err.message}`);
    }
  }
}
