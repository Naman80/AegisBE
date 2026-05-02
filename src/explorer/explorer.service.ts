import { Injectable } from '@nestjs/common';
import { ConnectionManager } from '../datasource/connection.manager.js';

@Injectable()
export class ExplorerService {
  constructor(private readonly connectionManager: ConnectionManager) {}

  async listNamespaces(datasourceId: string) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.listNamespaces();
  }

  async listEntities(datasourceId: string, namespace: string) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.listEntities(namespace);
  }
}
