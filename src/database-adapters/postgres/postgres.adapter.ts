import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Pool } from 'pg';
import {
  type AlterTableDto,
  type ConnectionConfig,
  type ConnectionTestResult,
  type CreateTableDto,
  type DatabaseAdapter,
  type DatabaseSchemaSummary,
  type DatabaseTableColumn,
  type DatabaseTableDetails,
  type DatabaseTableRelation,
  type DatabaseTableSummary,
  type TablePreviewResult,
} from '../interfaces/database-adapter.interface.js';

@Injectable()
export class PostgresAdapter implements DatabaseAdapter {
  async testConnection(
    connection: ConnectionConfig,
  ): Promise<ConnectionTestResult> {
    const pool = this.createPool(connection);

    try {
      await pool.query('SELECT 1');
      return {
        success: true,
        message: 'PostgreSQL connection verified.',
      };
    } finally {
      await pool.end();
    }
  }

  async listSchemas(
    connection: ConnectionConfig,
  ): Promise<DatabaseSchemaSummary[]> {
    const pool = this.createPool(connection);

    try {
      const result = await pool.query<{ name: string }>(
        `
          SELECT schema_name AS name
          FROM information_schema.schemata
          WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
          ORDER BY schema_name
        `,
      );

      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async listTables(
    connection: ConnectionConfig,
    schema: string,
  ): Promise<DatabaseTableSummary[]> {
    const pool = this.createPool(connection);

    try {
      const result = await pool.query<DatabaseTableSummary>(
        `
          SELECT
            table_schema AS schema,
            table_name AS name,
            table_type AS type
          FROM information_schema.tables
          WHERE table_schema = $1
          ORDER BY table_name
        `,
        [schema],
      );

      return result.rows;
    } finally {
      await pool.end();
    }
  }

  async getTableDetails(
    connection: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<DatabaseTableDetails> {
    const pool = this.createPool(connection);

    try {
      const columnsResult = await pool.query<DatabaseTableColumn>(
        `
          SELECT
            c.column_name AS name,
            c.data_type AS "dataType",
            c.is_nullable = 'YES' AS "isNullable",
            c.column_default AS "defaultValue",
            (
              SELECT 
                CASE
                  WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PK'
                  WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FK'
                  WHEN tc.constraint_type = 'UNIQUE' THEN 'UN'
                  ELSE NULL
                END
              FROM information_schema.key_column_usage kcu
              JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
                AND kcu.table_name = tc.table_name
              WHERE kcu.table_schema = c.table_schema
                AND kcu.table_name = c.table_name
                AND kcu.column_name = c.column_name
              ORDER BY 
                CASE 
                  WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1
                  WHEN tc.constraint_type = 'FOREIGN KEY' THEN 2
                  WHEN tc.constraint_type = 'UNIQUE' THEN 3
                  ELSE 4
                END
              LIMIT 1
            ) AS "keyType"
          FROM information_schema.columns c
          WHERE c.table_schema = $1
            AND c.table_name = $2
          ORDER BY c.ordinal_position
        `,
        [schema, table],
      );

      const relationsResult = await pool.query<DatabaseTableRelation>(
        `
          SELECT
            tc.constraint_name AS "constraintName",
            kcu.column_name AS "columnName",
            ccu.table_schema AS "referencedSchema",
            ccu.table_name AS "referencedTable",
            ccu.column_name AS "referencedColumn"
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
            AND tc.table_name = $2
        `,
        [schema, table],
      );

      return {
        schema,
        name: table,
        columns: columnsResult.rows,
        relations: relationsResult.rows,
      };
    } finally {
      await pool.end();
    }
  }

  async getFullSchema(
    connection: ConnectionConfig,
    schema: string,
  ): Promise<DatabaseTableDetails[]> {
    const pool = this.createPool(connection);

    try {
      const columnsResult = await pool.query<DatabaseTableColumn & { table_name: string }>(
        `
          SELECT
            c.table_name,
            c.column_name AS name,
            c.data_type AS "dataType",
            c.is_nullable = 'YES' AS "isNullable",
            c.column_default AS "defaultValue",
            (
              SELECT 
                CASE
                  WHEN tc.constraint_type = 'PRIMARY KEY' THEN 'PK'
                  WHEN tc.constraint_type = 'FOREIGN KEY' THEN 'FK'
                  WHEN tc.constraint_type = 'UNIQUE' THEN 'UN'
                  ELSE NULL
                END
              FROM information_schema.key_column_usage kcu
              JOIN information_schema.table_constraints tc
                ON kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
                AND kcu.table_name = tc.table_name
              WHERE kcu.table_schema = c.table_schema
                AND kcu.table_name = c.table_name
                AND kcu.column_name = c.column_name
              ORDER BY 
                CASE 
                  WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1
                  WHEN tc.constraint_type = 'FOREIGN KEY' THEN 2
                  WHEN tc.constraint_type = 'UNIQUE' THEN 3
                  ELSE 4
                END
              LIMIT 1
            ) AS "keyType"
          FROM information_schema.columns c
          WHERE c.table_schema = $1
          ORDER BY c.table_name, c.ordinal_position
        `,
        [schema],
      );

      const relationsResult = await pool.query<DatabaseTableRelation & { table_name: string }>(
        `
          SELECT
            tc.table_name,
            tc.constraint_name AS "constraintName",
            kcu.column_name AS "columnName",
            ccu.table_schema AS "referencedSchema",
            ccu.table_name AS "referencedTable",
            ccu.column_name AS "referencedColumn"
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = $1
          ORDER BY tc.table_name
        `,
        [schema],
      );

      const tablesMap = new Map<string, DatabaseTableDetails>();

      for (const row of columnsResult.rows) {
        const { table_name, ...column } = row;
        if (!tablesMap.has(table_name)) {
          tablesMap.set(table_name, {
            schema,
            name: table_name,
            columns: [],
            relations: [],
          });
        }
        tablesMap.get(table_name)!.columns.push(column);
      }

      for (const row of relationsResult.rows) {
        const { table_name, ...relation } = row;
        if (tablesMap.has(table_name)) {
          tablesMap.get(table_name)!.relations.push(relation);
        }
      }

      return Array.from(tablesMap.values());
    } finally {
      await pool.end();
    }
  }

  async previewRows(
    connection: ConnectionConfig,
    schema: string,
    table: string,
    limit: number,
    offset: number,
  ): Promise<TablePreviewResult> {
    const pool = this.createPool(connection);
    const safeTableRef = `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`;

    try {
      const rowsResult = await pool.query<Record<string, unknown>>(
        `SELECT * FROM ${safeTableRef} LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const countResult = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM ${safeTableRef}`,
      );

      return {
        columns: rowsResult.fields.map((field) => field.name),
        rows: rowsResult.rows,
        totalCount: Number(countResult.rows[0]?.count ?? 0),
        limit,
        offset,
      };
    } catch {
      throw new InternalServerErrorException(
        `Failed to preview rows for ${schema}.${table}.`,
      );
    } finally {
      await pool.end();
    }
  }

  async createTable(
    connection: ConnectionConfig,
    schema: string,
    table: CreateTableDto,
  ): Promise<void> {
    const pool = this.createPool(connection);
    const columnsSql = table.columns
      .map((c) => {
        let sql = `${this.escapeIdentifier(c.name)} ${c.dataType}`;
        if (!c.isNullable) {
          sql += ' NOT NULL';
        }
        if (c.defaultValue) {
          sql += ` DEFAULT ${c.defaultValue}`;
        }
        if (c.keyType === 'PK') {
          sql += ' PRIMARY KEY';
        }
        return sql;
      })
      .join(', ');

    const sql = `CREATE TABLE ${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table.name)} (${columnsSql})`;

    try {
      await pool.query(sql);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to create table ${schema}.${table.name}: ${error.message}`,
      );
    } finally {
      await pool.end();
    }
  }

  async alterTable(
    connection: ConnectionConfig,
    schema: string,
    table: string,
    changes: AlterTableDto,
  ): Promise<void> {
    const pool = this.createPool(connection);
    const tableRef = `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`;
    const actions: string[] = [];

    if (changes.name && changes.name !== table) {
      actions.push(`RENAME TO ${this.escapeIdentifier(changes.name)}`);
    }

    if (changes.addColumns) {
      for (const col of changes.addColumns) {
        let colSql = `ADD COLUMN ${this.escapeIdentifier(col.name)} ${col.dataType}`;
        if (!col.isNullable) {
          colSql += ' NOT NULL';
        }
        if (col.defaultValue) {
          colSql += ` DEFAULT ${col.defaultValue}`;
        }
        actions.push(colSql);
      }
    }

    if (changes.dropColumns) {
      for (const colName of changes.dropColumns) {
        actions.push(`DROP COLUMN ${this.escapeIdentifier(colName)}`);
      }
    }

    if (changes.modifyColumns) {
      for (const col of changes.modifyColumns) {
        actions.push(
          `ALTER COLUMN ${this.escapeIdentifier(col.name)} TYPE ${col.dataType}`,
        );
        actions.push(
          `ALTER COLUMN ${this.escapeIdentifier(col.name)} ${col.isNullable ? 'DROP' : 'SET'} NOT NULL`,
        );
      }
    }

    if (actions.length === 0) {
      return;
    }

    try {
      // In Postgres, RENAME TO cannot be combined with other actions
      const renameAction = actions.find((a) => a.startsWith('RENAME TO'));
      const otherActions = actions.filter((a) => !a.startsWith('RENAME TO'));

      if (renameAction) {
        await pool.query(`ALTER TABLE ${tableRef} ${renameAction}`);
      }

      if (otherActions.length > 0) {
        const currentTableRef = changes.name
          ? `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(changes.name)}`
          : tableRef;
        await pool.query(`ALTER TABLE ${currentTableRef} ${otherActions.join(', ')}`);
      }
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to alter table ${schema}.${table}: ${error.message}`,
      );
    } finally {
      await pool.end();
    }
  }

  async dropTable(
    connection: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<void> {
    const pool = this.createPool(connection);
    const tableRef = `${this.escapeIdentifier(schema)}.${this.escapeIdentifier(table)}`;

    try {
      await pool.query(`DROP TABLE ${tableRef}`);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to drop table ${schema}.${table}: ${error.message}`,
      );
    } finally {
      await pool.end();
    }
  }

  private createPool(connection: ConnectionConfig) {
    return new Pool({
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.username,
      password: connection.password,
      ssl:
        connection.sslMode === 'disable'
          ? false
          : { rejectUnauthorized: connection.sslMode === 'verify_full' },
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 5_000,
    });
  }

  private escapeIdentifier(value: string) {
    return `"${value.replaceAll('"', '""')}"`;
  }
}
