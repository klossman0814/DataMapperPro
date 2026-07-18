import { Injectable } from '@nestjs/common';

export interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
  rowCount: number;
}

// Configurable timeouts with env overrides
const CONNECT_TIMEOUT = parseInt(process.env.DB_CONNECT_TIMEOUT || '30000', 10);
const QUERY_TIMEOUT = parseInt(process.env.DB_QUERY_TIMEOUT || '300000', 10);

export type DbConnection = any;

@Injectable()
export class DatabaseQueryService {
  async executeQuery(
    type: string,
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sql: string,
  ): Promise<QueryResult> {
    const conn = await this.createConnection(type, config);
    try {
      return await this.executeOnConnection(type, conn, sql);
    } finally {
      await this.closeConnection(type, conn);
    }
  }

  async createConnection(
    type: string,
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
  ): Promise<DbConnection> {
    switch (type) {
      case 'mssql':
        return this.createMssqlConnection(config);
      case 'postgresql':
        return this.createPostgresConnection(config);
      case 'mysql':
        return this.createMysqlConnection(config);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  async executeOnConnection(type: string, connection: DbConnection, sql: string): Promise<QueryResult> {
    switch (type) {
      case 'mssql':
        return this.execMssql(connection, sql);
      case 'postgresql':
        return this.execPostgres(connection, sql);
      case 'mysql':
        return this.execMysql(connection, sql);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  async closeConnection(type: string, connection: DbConnection): Promise<void> {
    switch (type) {
      case 'mssql':
        await connection.close();
        break;
      case 'postgresql':
        await connection.end();
        break;
      case 'mysql':
        await connection.end();
        break;
    }
  }

  // --- PostgreSQL ---

  private async createPostgresConnection(config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean }): Promise<DbConnection> {
    const { Pool } = await import('pg');
    return new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: CONNECT_TIMEOUT,
      query_timeout: QUERY_TIMEOUT,
      max: 1, // one connection since we reuse sequentially
    });
  }

  private async execPostgres(pool: DbConnection, sql: string): Promise<QueryResult> {
    const result = await pool.query(sql);
    const rows = result.rows || [];
    return {
      columns: rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name, type: 'string' })) : [],
      rows,
      rowCount: rows.length,
    };
  }

  // --- MySQL ---

  private async createMysqlConnection(config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean }): Promise<DbConnection> {
    const mysql = await import('mysql2/promise');
    return mysql.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
      connectTimeout: CONNECT_TIMEOUT,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
    } as any);
  }

  private async execMysql(conn: DbConnection, sql: string): Promise<QueryResult> {
    const [rows] = await conn.execute(sql);
    const rowArr = rows as Record<string, any>[];
    return {
      columns: rowArr.length > 0 ? Object.keys(rowArr[0]).map((name) => ({ name, type: 'string' })) : [],
      rows: rowArr,
      rowCount: rowArr.length,
    };
  }

  // --- MSSQL ---

  private async createMssqlConnection(config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean }): Promise<DbConnection> {
    const mssql = await import('mssql');
    return mssql.connect({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      options: {
        encrypt: config.ssl ?? false,
        trustServerCertificate: true,
        connectTimeout: CONNECT_TIMEOUT,
        requestTimeout: QUERY_TIMEOUT,
        cancelTimeout: 5000,
      },
      pool: { max: 1, min: 0, idleTimeoutMillis: 30000 },
    });
  }

  private async execMssql(pool: DbConnection, sql: string): Promise<QueryResult> {
    const result = await pool.request().query(sql);
    const rows = result.recordset || [];
    return {
      columns: rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name, type: 'string' })) : [],
      rows,
      rowCount: rows.length,
    };
  }
}
