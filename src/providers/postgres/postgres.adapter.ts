import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseAdapter, ConnectionConfig } from '../database/database.interface.js';
import { Namespace, Entity, Field } from '../../common/types/normalization.js';
import { QueryResult, QueryInput } from '../../query/types/query.types.js';

@Injectable()
export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    if (this.pool) {
      await this.disconnect();
    }
    this.pool = this.createPool(config);
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  async listNamespaces(): Promise<Namespace[]> {
    const pool = this.getPool();
    try {
      const result = await pool.query<{ name: string }>(
        `
          SELECT schema_name AS name
          FROM information_schema.schemata
          WHERE schema_name NOT IN ('pg_catalog', 'information_schema' , 'pg_toast' , 'ppg')
          ORDER BY schema_name
        `
      );
      return result.rows.map(row => ({ name: row.name }));
    } catch (error) {
      throw new InternalServerErrorException(`Failed to list namespaces: ${error.message}`);
    }
  }

  async listEntities(namespace: string): Promise<Entity[]> {
    const pool = this.getPool();
    try {
      const result = await pool.query<{ name: string; type: string }>(
        `
          SELECT
            table_name AS name,
            table_type AS type
          FROM information_schema.tables
          WHERE table_schema = $1
          ORDER BY table_name
        `,
        [namespace]
      );
      return result.rows.map(row => ({
        name: row.name,
        namespace,
        type: row.type === 'VIEW' ? 'view' : 'table'
      }));
    } catch (error) {
      throw new InternalServerErrorException(`Failed to list entities in ${namespace}: ${error.message}`);
    }
  }

  async getEntitySchema(namespace: string, entity: string): Promise<Field[]> {
    const pool = this.getPool();
    try {
      const result = await pool.query(
        `
          SELECT
            c.column_name AS name,
            c.data_type AS type,
            c.is_nullable = 'YES' AS "isNullable",
            c.column_default AS "defaultValue",
            EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
              WHERE tc.table_schema = c.table_schema
                AND tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
                AND tc.constraint_type = 'PRIMARY KEY'
            ) AS "isPrimaryKey"
          FROM information_schema.columns c
          WHERE c.table_schema = $1
            AND c.table_name = $2
          ORDER BY c.ordinal_position
        `,
        [namespace, entity]
      );

      return result.rows.map(row => ({
        name: row.name,
        type: this.normalizeType(row.type),
        isNullable: row.isNullable,
        isPrimaryKey: row.isPrimaryKey,
        defaultValue: row.defaultValue ?? undefined
      }));
    } catch (error) {
      throw new InternalServerErrorException(`Failed to get schema for ${namespace}.${entity}: ${error.message}`);
    }
  }

  async getAllEntitySchema(namespace: string): Promise<Record<string, { type: string; fields: Field[] }>> {
    const pool = this.getPool();
    try {
      const result = await pool.query(
        `
          SELECT
            c.table_name AS entity,
            t.table_type AS entity_type,
            c.column_name AS name,
            c.data_type AS type,
            c.is_nullable = 'YES' AS "isNullable",
            c.column_default AS "defaultValue",
            EXISTS (
              SELECT 1 FROM information_schema.table_constraints tc
              JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
              WHERE tc.table_schema = c.table_schema
                AND tc.table_name = c.table_name
                AND kcu.column_name = c.column_name
                AND tc.constraint_type = 'PRIMARY KEY'
            ) AS "isPrimaryKey"
          FROM information_schema.columns c
          JOIN information_schema.tables t ON c.table_schema = t.table_schema AND c.table_name = t.table_name
          WHERE c.table_schema = $1
          ORDER BY c.table_name, c.ordinal_position
        `,
        [namespace]
      );

      const allEntitySchemas: Record<string, { type: string; fields: Field[] }> = {};
      for (const row of result.rows) {
        if (!allEntitySchemas[row.entity]) {
          allEntitySchemas[row.entity] = {
            type: row.entity_type === 'VIEW' ? 'view' : 'table',
            fields: []
          };
        }
        allEntitySchemas[row.entity].fields.push({
          name: row.name,
          type: this.normalizeType(row.type),
          isNullable: row.isNullable,
          isPrimaryKey: row.isPrimaryKey,
          defaultValue: row.defaultValue ?? undefined
        });
      }
      return allEntitySchemas;
    } catch (error) {
      throw new InternalServerErrorException(`Failed to get all entity schemas for ${namespace}: ${error.message}`);
    }
  }

  async createEntity(namespace: string, name: string, fields: any[]): Promise<void> {
    const pool = this.getPool();
    const fieldsSql = fields.map(f => {
      let sql = `${this.escapeIdentifier(f.name)} ${f.type}`;
      if (!f.isNullable) sql += ' NOT NULL';
      if (f.defaultValue) sql += ` DEFAULT ${f.defaultValue}`;
      if (f.isPrimaryKey) sql += ' PRIMARY KEY';
      return sql;
    }).join(', ');

    const sql = `CREATE TABLE ${this.escapeIdentifier(namespace)}.${this.escapeIdentifier(name)} (${fieldsSql})`;
    try {
      await pool.query(sql);
    } catch (error) {
      throw new InternalServerErrorException(`Failed to create entity ${namespace}.${name}: ${error.message}`);
    }
  }

  async alterEntity(namespace: string, name: string, changes: any): Promise<void> {
    const pool = this.getPool();
    const tableRef = `${this.escapeIdentifier(namespace)}.${this.escapeIdentifier(name)}`;
    const actions: string[] = [];

    if (changes.name && changes.name !== name) {
      actions.push(`RENAME TO ${this.escapeIdentifier(changes.name)}`);
    }

    if (changes.addFields) {
      for (const f of changes.addFields) {
        let colSql = `ADD COLUMN ${this.escapeIdentifier(f.name)} ${f.type}`;
        if (!f.isNullable) colSql += ' NOT NULL';
        if (f.defaultValue) colSql += ` DEFAULT ${f.defaultValue}`;
        actions.push(colSql);
      }
    }

    if (changes.dropFields) {
      for (const fieldName of changes.dropFields) {
        actions.push(`DROP COLUMN ${this.escapeIdentifier(fieldName)}`);
      }
    }

    if (actions.length === 0) return;

    try {
      // Postgres RENAME cannot be combined
      const rename = actions.find(a => a.startsWith('RENAME'));
      const others = actions.filter(a => !a.startsWith('RENAME'));

      if (rename) await pool.query(`ALTER TABLE ${tableRef} ${rename}`);
      if (others.length > 0) {
        const currentRef = rename
          ? `${this.escapeIdentifier(namespace)}.${this.escapeIdentifier(changes.name)}`
          : tableRef;
        await pool.query(`ALTER TABLE ${currentRef} ${others.join(', ')}`);
      }
    } catch (error) {
      throw new InternalServerErrorException(`Failed to alter entity ${namespace}.${name}: ${error.message}`);
    }
  }

  async dropEntity(namespace: string, name: string): Promise<void> {
    // const pool = this.getPool();
    // const tableRef = `${this.escapeIdentifier(namespace)}.${this.escapeIdentifier(name)}`;
    // try {
    //   await pool.query(`DROP TABLE ${tableRef}`);
    // } catch (error) {
    //   throw new InternalServerErrorException(`Failed to drop entity ${namespace}.${name}: ${error.message}`);
    // }
  }

  async query(input: QueryInput): Promise<QueryResult> {
    const pool = this.getPool();
    const startTime = Date.now();
    const client = await pool.connect();

    try {
      // Set search path to the requested namespace
      await client.query(`SET search_path TO ${this.escapeIdentifier(input.namespace)}`);

      let sql = input.query.trim();

      if (sql.endsWith(';')) {
        sql = sql.slice(0, -1);
      }

      // Basic LIMIT/OFFSET handling if not already in SQL
      if (input.limit && !sql.toLowerCase().includes('limit')) {
        sql += ` LIMIT ${input.limit}`;
      }
      if (input.offset && !sql.toLowerCase().includes('offset')) {
        sql += ` OFFSET ${input.offset}`;
      }

      const result = await client.query(sql);
      const timeMs = Date.now() - startTime;

      return {
        columns: result.fields.map(f => f.name),
        rows: result.rows,
        totalCount: result.rowCount ?? result.rows.length,
        timeMs,
        truncated: input.limit ? result.rows.length >= input.limit : false
      };
    } catch (error) {
      throw new InternalServerErrorException(`Query execution failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  async testConnection(config: ConnectionConfig): Promise<{ success: boolean; message: string }> {
    const tempPool = this.createPool(config);
    try {
      await tempPool.query('SELECT 1');
      return { success: true, message: 'PostgreSQL connection verified.' };
    } catch (err) {
      return { success: false, message: `Connection failed: ${err.message}` };
    } finally {
      await tempPool.end();
    }
  }

  private createPool(config: ConnectionConfig) {
    return new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.sslMode === 'disable' ? false : { rejectUnauthorized: false },
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10000,
    });
  }

  private getPool(): Pool {
    if (!this.pool) {
      throw new InternalServerErrorException('Database not connected. Please initialize connection first.');
    }
    return this.pool;
  }

  private escapeIdentifier(value: string) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private normalizeType(pgType: string): string {
    const type = pgType.toLowerCase();
    if (type.includes('char') || type.includes('text') || type === 'uuid') return 'string';
    if (type.includes('int') || type === 'numeric' || type === 'real' || type === 'double precision') return 'number';
    if (type === 'boolean') return 'boolean';
    if (type.includes('timestamp') || type === 'date') return 'datetime';
    if (type === 'json' || type === 'jsonb') return 'json';
    return type; // Fallback to raw type if unknown
  }
}
