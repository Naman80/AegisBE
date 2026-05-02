export interface Namespace {
  name: string;
  description?: string;
}

export interface Entity {
  name: string;
  namespace: string;
  type: 'table' | 'collection' | 'view';
}

export interface Field {
  name: string;
  type: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
  description?: string;
}

export interface RecordData extends Record<string, any> {}

export interface QueryResult {
  columns: string[];
  rows: RecordData[];
  totalCount?: number;
  executionTimeMs?: number;
}
