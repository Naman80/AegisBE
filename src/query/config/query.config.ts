export const QUERY_CONFIG = {
  MAX_ROWS_DEFAULT: 1000,        // Default soft cap if client omits limit
  MAX_ROWS_HARD_CAP: 10_000,     // Absolute ceiling, adapter enforces this
  QUERY_TIMEOUT_DEFAULT: 30_000, // 30s default
  QUERY_TIMEOUT_MAX: 120_000,    // 2 minute ceiling
  PREVIEW_PAGE_SIZE_DEFAULT: 50,
  PREVIEW_PAGE_SIZE_MAX: 500,
};
