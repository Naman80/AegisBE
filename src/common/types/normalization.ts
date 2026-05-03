import { QueryResult, RecordData } from '../../query/types/query.types.js';

export type { QueryResult, RecordData };

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
