import { QueryInput } from '../types/query.types.js';
import { QUERY_CONFIG } from '../config/query.config.js';

export class PreviewBuilder {
  static build(
    namespace: string,
    entity: string,
    pagination: { page?: number; pageSize?: number }
  ): QueryInput {
    const page = pagination.page || 1;
    const pageSize = Math.min(
      pagination.pageSize || QUERY_CONFIG.PREVIEW_PAGE_SIZE_DEFAULT,
      QUERY_CONFIG.PREVIEW_PAGE_SIZE_MAX
    );
    
    const offset = (page - 1) * pageSize;

    return {
      namespace,
      entity,
      // The adapter translates this to provider syntax. 
      // For now, we assume standard SQL-like SELECT * for the base query.
      query: `SELECT * FROM "${namespace}"."${entity}"`,
      limit: pageSize,
      offset: offset,
    };
  }
}
