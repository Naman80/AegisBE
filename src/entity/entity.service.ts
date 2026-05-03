import { Injectable } from '@nestjs/common';
import { ConnectionManager } from '../datasource/connection.manager.js';
import { AlterEntityDto, EntityFieldDefinition } from '../providers/database/database.interface.js';

@Injectable()
export class EntityService {
  constructor(private readonly connectionManager: ConnectionManager) { }

  async getEntitySchema(datasourceId: string, namespace: string, entity: string) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.getEntitySchema(namespace, entity);
  }

  async getAllEntitySchema(datasourceId: string, namespace: string) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.getAllEntitySchema(namespace);
  }

  async createEntity(datasourceId: string, namespace: string, name: string, fields: EntityFieldDefinition[]) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.createEntity(namespace, name, fields);
  }

  async alterEntity(datasourceId: string, namespace: string, name: string, changes: AlterEntityDto) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.alterEntity(namespace, name, changes);
  }

  async dropEntity(datasourceId: string, namespace: string, name: string) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.dropEntity(namespace, name);
  }
}
