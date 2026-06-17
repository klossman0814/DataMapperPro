import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createDecipheriv, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MigrationEngineService } from './engine/migration-engine.service';
import { DiscoverColumnsDto, PreviewRowsDto, RunMigrationDto } from './dto/run-migration.dto';

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
export class DatabaseMigrationService {
  constructor(
    private prisma: PrismaService,
    private engine: MigrationEngineService,
  ) {}

  private async getConnectionConfig(id: string, userId: string) {
    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id, createdById: userId },
    });
    if (!conn) throw new NotFoundException('Database connection not found');
    const password = decryptPassword(conn.encryptedPassword);
    return {
      type: conn.type,
      config: {
        host: conn.host,
        port: conn.port,
        database: conn.databaseName,
        username: conn.username,
        password,
        ssl: conn.sslEnabled ?? false,
      },
    };
  }

  async discoverTables(connectionId: string, userId: string) {
    const { type, config } = await this.getConnectionConfig(connectionId, userId);
    return this.engine.discoverTables(type, config);
  }

  async discoverColumns(dto: DiscoverColumnsDto, userId: string) {
    const { type, config } = await this.getConnectionConfig(dto.connectionId, userId);
    return this.engine.discoverColumns(type, config, dto.tableName);
  }

  async previewRows(dto: PreviewRowsDto, userId: string) {
    const { type, config } = await this.getConnectionConfig(dto.sourceConnectionId, userId);
    return this.engine.previewRows(type, config, dto.sourceTable, dto.columnMappings, dto.limit ?? 10);
  }

  async runMigration(dto: RunMigrationDto, userId: string) {
    const sourceConn = await this.getConnectionConfig(dto.sourceConnectionId, userId);
    const destConn = await this.getConnectionConfig(dto.destConnectionId, userId);

    return this.engine.runMigration(
      sourceConn.type, sourceConn.config,
      destConn.type, destConn.config,
      dto.sourceTable,
      dto.destTable,
      dto.columnMappings,
      dto.dropExisting ?? false,
      dto.batchSize ?? 500,
      dto.createTable ?? true,
    );
  }
}
