import { Injectable } from '@nestjs/common';
import { DatabaseAdapterService } from '../database-adapters/database-adapter.service.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { CreateTableDto, AlterTableDto } from '../database-adapters/interfaces/database-adapter.interface.js';

@Injectable()
export class SchemaService {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly adapters: DatabaseAdapterService,
  ) {}

  async createTable(schema: string, table: CreateTableDto) {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    return this.adapters.getAdapter(connection).createTable(connection, schema, table);
  }

  async alterTable(schema: string, table: string, changes: AlterTableDto) {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    return this.adapters.getAdapter(connection).alterTable(connection, schema, table, changes);
  }

  async dropTable(schema: string, table: string) {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    return this.adapters.getAdapter(connection).dropTable(connection, schema, table);
  }
}
