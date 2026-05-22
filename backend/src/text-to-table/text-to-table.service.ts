import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatabaseQueryService } from '../database-connections/engine/database-query.service';
import { DatabaseConnectionsService } from '../database-connections/database-connections.service';
import { TextParserService } from './engine/text-parser.service';
import { TableCreatorService } from './engine/table-creator.service';
import { ParseTextDto } from './dto/parse-text.dto';
import { ImportTableDto } from './dto/import-table.dto';

@Injectable()
export class TextToTableService {
  constructor(
    private prisma: PrismaService,
    private queryService: DatabaseQueryService,
    private connectionsService: DatabaseConnectionsService,
    private textParser: TextParserService,
    private tableCreator: TableCreatorService,
  ) {}

  parseText(dto: ParseTextDto) {
    if (!dto.text.trim()) {
      throw new BadRequestException('Text content is empty');
    }
    if (!dto.separators || dto.separators.length === 0) {
      throw new BadRequestException('At least one separator is required');
    }

    return this.textParser.parse(
      dto.text,
      dto.separators,
      dto.parseMode || 'flat',
      dto.hasHeader !== false,
    );
  }

  async importToDatabase(dto: ImportTableDto, userId: string) {
    if (!dto.rows || dto.rows.length === 0) {
      throw new BadRequestException('No rows to import');
    }
    if (!dto.columns || dto.columns.length === 0) {
      throw new BadRequestException('No columns defined');
    }
    if (!dto.tableName.trim()) {
      throw new BadRequestException('Table name is required');
    }

    const conn = await this.prisma.databaseConnection.findFirst({
      where: { id: dto.connectionId, createdById: userId },
    });
    if (!conn) {
      throw new BadRequestException('Database connection not found');
    }

    if (dto.dropExisting) {
      const dropDDL = this.tableCreator.generateCreateTable(dto.tableName, dto.columns, true);
      await this.executeOnConnection(conn, dropDDL);
    }

    const createDDL = this.tableCreator.generateCreateTable(dto.tableName, dto.columns, false);
    await this.executeOnConnection(conn, createDDL);

    const batchSize = dto.batchSize || 100;
    const result = this.tableCreator.generateInsertStatements(dto.tableName, dto.columns, dto.rows, batchSize);

    let totalInserted = 0;
    const ddlStatements: string[] = [createDDL];

    for (const insertSql of result.insertStatements) {
      await this.executeOnConnection(conn, insertSql);
      totalInserted += batchSize;
    }

    return {
      tableName: dto.tableName,
      rowsInserted: dto.rows.length,
      ddlStatements,
    };
  }

  private async executeOnConnection(conn: any, sql: string) {
    const { decrypt } = await this.getCryptoUtils();
    const password = decrypt(conn.encryptedPassword);
    try {
      await this.queryService.executeQuery(
        conn.type,
        {
          host: conn.host,
          port: conn.port,
          database: conn.databaseName,
          username: conn.username,
          password,
          ssl: conn.sslEnabled,
        },
        sql,
      );
    } catch (err: any) {
      throw new BadRequestException(`Database error: ${err.message}`);
    }
  }

  private async getCryptoUtils() {
    const crypto = await import('crypto');
    const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'datamapper-default-change-me';

    function decrypt(encrypted: string): string {
      const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
      const parts = encrypted.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encryptedText = Buffer.from(parts[2], 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);
      return decipher.update(encryptedText as any, 'hex', 'utf8') + decipher.final('utf8');
    }

    return { decrypt };
  }
}
