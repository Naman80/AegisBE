import { Injectable } from '@nestjs/common';
import { clampLimit, clampOffset } from '../common/utils/pagination.js';
import { ConnectionsService } from '../connections/connections.service.js';
import { DatabaseAdapterService } from '../database-adapters/database-adapter.service.js';

@Injectable()
export class TableBrowserService {
  constructor(
    private readonly connectionsService: ConnectionsService,
    private readonly adapters: DatabaseAdapterService,
  ) {}

  async previewRows(
    schema: string,
    table: string,
    limit?: number,
    offset?: number,
  ) {
    const connection = await this.connectionsService.getActiveConnectionConfig();
    const safeLimit = clampLimit(limit);
    const safeOffset = clampOffset(offset);

    return this.adapters
      .getAdapter(connection)
      .previewRows(connection, schema, table, safeLimit, safeOffset);
  }
}
