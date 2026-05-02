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
    
    // For now, we assume SQL-like select all. 
    // In a multi-provider world, the adapter might need a more specialized preview method
    // but for now we can use raw query via the adapter's capabilities.
    
    // Postgres specific for now if we use raw query, 
    // or we can add a 'previewEntity' to the DatabaseAdapter interface if we want pure agnostic.
    
    // Actually, let's add previewEntity to the interface to be safe and clean.
    return adapter.query({
      namespace,
      entity,
      query: `SELECT * FROM "${namespace}"."${entity}"`, // This is PG specific
      limit,
      offset,
    });
  }
}
