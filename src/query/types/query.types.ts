export interface RecordData extends Record<string, any> {}

export interface QueryInput {
  namespace: string;
  query: string;
  limit?: number;       // Soft row cap, defaults to MAX_ROWS_DEFAULT
  offset?: number;      // For pagination
  timeout?: number;     // Query timeout in ms, defaults to QUERY_TIMEOUT_DEFAULT
  entity?: string;      // Optional entity name for context
}

export interface QueryResult {
  columns: string[];             // Ordered column/field names
  rows: RecordData[];            // Normalized rows (JSON-safe values only)
  totalCount: number;            // Total matching rows (for pagination UI)
  timeMs: number;                // Wall-clock execution time
  truncated: boolean;            // True if row cap was applied
}
