import { Injectable } from '@nestjs/common';
import { DatabaseType } from '../common/enums/database-type.enum.js';
import type { ConnectionConfig } from './interfaces/database-adapter.interface.js';
import { PostgresAdapter } from './postgres/postgres.adapter.js';

@Injectable()
export class DatabaseAdapterService {
  constructor(private readonly postgresAdapter: PostgresAdapter) {}

  getAdapter(connection: Pick<ConnectionConfig, 'type'>) {
    switch (connection.type) {
      case DatabaseType.POSTGRES:
        return this.postgresAdapter;
      default:
        throw new Error(`Unsupported database type: ${connection.type}`);
    }
  }
}
