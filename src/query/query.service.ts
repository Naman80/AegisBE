import { Injectable } from '@nestjs/common';
import { ConnectionManager } from '../datasource/connection.manager.js';

@Injectable()
export class QueryService {
  constructor(private readonly connectionManager: ConnectionManager) {}

  async executeQuery(datasourceId: string, input: {
    namespace: string;
    entity?: string;
    query: string;
    limit?: number;
    offset?: number;
  }) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.query(input);
  }

  async previewEntity(
    datasourceId: string,
    namespace: string,
    entity: string,
    limit = 50,
    offset = 0
  ) {
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    return adapter.query({
      namespace,
      entity,
      query: `SELECT * FROM "${namespace}"."${entity}"`,
      limit,
      offset,
    });
  }
}
