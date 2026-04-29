import { Injectable } from '@nestjs/common';
import { DatabaseAdapterService } from '../database-adapters/database-adapter.service.js';
import { ConnectionsService } from '../connections/connections.service.js';

@Injectable()
export class IntrospectionService {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly adapters: DatabaseAdapterService,
  ) {}

  async listSchemas() {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    return this.adapters.getAdapter(connection).listSchemas(connection);
  }

  async listTables(schema: string) {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    return this.adapters.getAdapter(connection).listTables(connection, schema);
  }

  async getTableDetails(schema: string, table: string) {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    return this.adapters
      .getAdapter(connection)
      .getTableDetails(connection, schema, table);
  }
}
