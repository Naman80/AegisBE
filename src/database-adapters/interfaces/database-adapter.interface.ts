import type { DatabaseConnection } from '../../../generated/prisma/client.js';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

export interface DatabaseSchemaSummary {
  name: string;
}

export interface DatabaseTableSummary {
  schema: string;
  name: string;
  type: string;
}

export interface DatabaseTableColumn {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue: string | null;
  keyType?: 'PK' | 'FK' | 'UN';
}

export interface DatabaseTableRelation {
  constraintName: string;
  columnName: string;
  referencedSchema: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface DatabaseTableDetails {
  schema: string;
  name: string;
  columns: DatabaseTableColumn[];
  relations: DatabaseTableRelation[];
}

export interface TablePreviewResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
  limit: number;
  offset: number;
}

export interface DatabaseAdapter {
  testConnection(connection: ConnectionConfig): Promise<ConnectionTestResult>;
  listSchemas(connection: ConnectionConfig): Promise<DatabaseSchemaSummary[]>;
  listTables(
    connection: ConnectionConfig,
    schema: string,
  ): Promise<DatabaseTableSummary[]>;
  getTableDetails(
    connection: ConnectionConfig,
    schema: string,
    table: string,
  ): Promise<DatabaseTableDetails>;
  previewRows(
    connection: ConnectionConfig,
    schema: string,
    table: string,
    limit: number,
    offset: number,
  ): Promise<TablePreviewResult>;
}

export interface ConnectionConfig {
  type: DatabaseConnection['type'];
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode: DatabaseConnection['sslMode'];
}
