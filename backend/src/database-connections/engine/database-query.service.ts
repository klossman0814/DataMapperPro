import { Injectable } from '@nestjs/common';

export interface QueryResult {
  columns: { name: string; type: string }[];
  rows: Record<string, any>[];
  rowCount: number;
}

const CONNECT_TIMEOUT = 8000;
const QUERY_TIMEOUT = 30000;

@Injectable()
export class DatabaseQueryService {
  async executeQuery(
    type: string,
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sql: string,
  ): Promise<QueryResult> {
    switch (type) {
      case 'mssql':
        return this.queryMssql(config, sql);
      case 'postgresql':
        return this.queryPostgres(config, sql);
      case 'mysql':
        return this.queryMysql(config, sql);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  private async queryMssql(
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sql: string,
  ): Promise<QueryResult> {
    const mssql = await import('mssql');
    const pool = await mssql.connect({
      server: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      options: { encrypt: config.ssl ?? false, trustServerCertificate: true, connectTimeout: CONNECT_TIMEOUT, requestTimeout: QUERY_TIMEOUT },
    });
    try {
      const result = await pool.request().query(sql);
      const rows = result.recordset || [];
      return {
        columns: rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name, type: 'string' })) : [],
        rows,
        rowCount: rows.length,
      };
    } finally {
      await pool.close();
    }
  }

  private async queryPostgres(
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sql: string,
  ): Promise<QueryResult> {
    const { Pool } = await import('pg');
    const pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: CONNECT_TIMEOUT,
      query_timeout: QUERY_TIMEOUT,
    });
    try {
      const result = await pool.query(sql);
      const rows = result.rows || [];
      return {
        columns: rows.length > 0 ? Object.keys(rows[0]).map((name) => ({ name, type: 'string' })) : [],
        rows,
        rowCount: rows.length,
      };
    } finally {
      await pool.end();
    }
  }

  private async queryMysql(
    config: { host: string; port: number; database: string; username: string; password: string; ssl?: boolean },
    sql: string,
  ): Promise<QueryResult> {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? {} : undefined,
      connectTimeout: CONNECT_TIMEOUT,
    });
    try {
      const [rows] = await connection.execute(sql);
      const rowArr = rows as Record<string, any>[];
      return {
        columns: rowArr.length > 0 ? Object.keys(rowArr[0]).map((name) => ({ name, type: 'string' })) : [],
        rows: rowArr,
        rowCount: rowArr.length,
      };
    } finally {
      await connection.end();
    }
  }
}
