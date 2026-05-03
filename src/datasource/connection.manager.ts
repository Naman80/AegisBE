import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { DatabaseAdapter, ConnectionConfig } from '../providers/database/database.interface.js';
import { DatabaseFactory } from '../providers/database/database.factory.js';
import { DatasourceService } from './datasource.service.js';

@Injectable()
export class ConnectionManager implements OnModuleDestroy {
  private activeAdapters: Map<string, DatabaseAdapter> = new Map();

  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly databaseFactory: DatabaseFactory,
  ) { }

  async getAdapter(datasourceId: string): Promise<DatabaseAdapter> {
    // Check cache
    if (this.activeAdapters.has(datasourceId)) {
      return this.activeAdapters.get(datasourceId)!;
    }

    // Get datasource config
    const datasource = await this.datasourceService.getDatasource(datasourceId);
    const config: ConnectionConfig = {
      type: datasource.type.toLowerCase() as any,
      host: datasource.host,
      port: datasource.port,
      database: datasource.database,
      username: datasource.username,
      password: datasource.password,
      sslMode: datasource.sslMode as any,
    };

    // Create and connect adapter
    const adapter = await this.databaseFactory.getAdapter(config.type);

    await adapter.connect(config);

    // Cache it
    this.activeAdapters.set(datasourceId, adapter);
    return adapter;
  }

  async closeConnection(datasourceId: string): Promise<void> {
    const adapter = this.activeAdapters.get(datasourceId);
    if (adapter) {
      await adapter.disconnect();
      this.activeAdapters.delete(datasourceId);
    }
  }

  async onModuleDestroy() {
    // Cleanup all connections on shutdown
    for (const id of this.activeAdapters.keys()) {
      await this.closeConnection(id);
    }
  }
}
