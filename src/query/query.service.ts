import { Injectable, RequestTimeoutException } from '@nestjs/common';
import { ConnectionManager } from '../datasource/connection.manager.js';
import { SafetyGuard } from './lib/safety-guard.js';
import { ResultNormalizer } from './lib/result-normalizer.js';
import { PreviewBuilder } from './lib/preview-builder.js';
import { QueryInput, QueryResult } from './types/query.types.js';
import { QUERY_CONFIG } from './config/query.config.js';

@Injectable()
export class QueryService {
  constructor(private readonly connectionManager: ConnectionManager) {}

  async executeQuery(datasourceId: string, input: QueryInput): Promise<QueryResult> {
    // 1. Safety Validation
    SafetyGuard.validate(input.query);

    // 2. Resolve Adapter
    const adapter = await this.connectionManager.getAdapter(datasourceId);

    // 3. Apply Defaults/Limits
    const limit = Math.min(
      input.limit || QUERY_CONFIG.MAX_ROWS_DEFAULT,
      QUERY_CONFIG.MAX_ROWS_HARD_CAP
    );
    const timeout = Math.min(
      input.timeout || QUERY_CONFIG.QUERY_TIMEOUT_DEFAULT,
      QUERY_CONFIG.QUERY_TIMEOUT_MAX
    );

    const queryInput: QueryInput = { ...input, limit, timeout };

    // 4. Execute with Timeout
    const result = await this.executeWithTimeout(
      adapter.query(queryInput),
      timeout
    );

    // 5. Normalize Result
    return {
      ...result,
      rows: ResultNormalizer.normalize(result.rows)
    };
  }

  async previewEntity(
    datasourceId: string,
    namespace: string,
    entity: string,
    pagination: { page?: number; pageSize?: number }
  ): Promise<QueryResult> {
    const queryInput = PreviewBuilder.build(namespace, entity, pagination);
    
    // Preview uses the same execution flow but bypasses SafetyGuard 
    // since it's system-generated.
    const adapter = await this.connectionManager.getAdapter(datasourceId);
    
    const result = await this.executeWithTimeout(
      adapter.query(queryInput),
      QUERY_CONFIG.QUERY_TIMEOUT_DEFAULT
    );

    return {
      ...result,
      rows: ResultNormalizer.normalize(result.rows)
    };
  }

  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new RequestTimeoutException(`Query exceeded timeout of ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
