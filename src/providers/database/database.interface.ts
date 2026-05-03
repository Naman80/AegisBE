import { Namespace, Entity, Field, QueryResult } from '../../common/types/normalization.js';

export interface ConnectionConfig {
  type: 'postgres' | 'mongodb' | 'mysql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  sslMode?: 'disable' | 'require' | 'verify-full';
}

export interface EntityFieldDefinition {
  name: string;
  type: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
}

export interface AlterEntityDto {
  name?: string;
  addFields?: EntityFieldDefinition[];
  dropFields?: string[];
  modifyFields?: EntityFieldDefinition[];
}

export interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  
  listNamespaces(): Promise<Namespace[]>;
  listEntities(namespace: string): Promise<Entity[]>;
  
  getEntitySchema(namespace: string, entity: string): Promise<Field[]>;
  getAllEntitySchema(namespace: string): Promise<Record<string, { type: string; fields: Field[] }>>;
  
  // Mutations
  createEntity(namespace: string, name: string, fields: EntityFieldDefinition[]): Promise<void>;
  alterEntity(namespace: string, name: string, changes: AlterEntityDto): Promise<void>;
  dropEntity(namespace: string, name: string): Promise<void>;
  
  query(input: {
    namespace: string;
    entity?: string;
    query: string;
    limit?: number;
    offset?: number;
  }): Promise<QueryResult>;
  
  testConnection(config: ConnectionConfig): Promise<{ success: boolean; message: string }>;
}
