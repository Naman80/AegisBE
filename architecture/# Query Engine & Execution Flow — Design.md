# Query Engine & Execution Flow — Design Document

> **Scope**: This document covers the full query execution lifecycle in Aegis — from raw SQL submission and paginated preview to result normalization and future extensibility points (AST-based query builder, AI integration, safety layer).

---

## 1. Objectives

The query engine must:

- Execute raw SQL (or provider-native commands) against any registered datasource
- Serve paginated entity previews with zero extra client logic
- Normalize all results into a unified, JSON-safe contract regardless of provider
- Enforce safety guardrails against destructive operations
- Be deterministic and testable at every layer
- Expose clean extension points for an AST-based query builder and eventual AI integration

---

## 2. Current Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/datasources/:id/query` | Execute a raw query string |
| `GET` | `/datasources/:id/namespaces/:ns/entities/:entity/preview` | Paginated entity preview |

These are the two entry points into the query engine. Everything below describes the shared pipeline they both flow through.

---

## 3. Architecture Overview

```
                       ┌─────────────────────────────┐
                       │       Client (Frontend)       │
                       └──────────────┬────────────────┘
                                      │
                          POST /query  │  GET /preview
                                      ▼
                       ┌─────────────────────────────┐
                       │       QueryController        │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │        QueryService          │  ← Business logic only
                       │  ┌──────────┐ ┌───────────┐ │
                       │  │  Safety  │ │  Preview  │ │
                       │  │  Guard   │ │  Builder  │ │
                       │  └──────────┘ └───────────┘ │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │      ConnectionManager       │  ← Adapter resolution
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │       DatabaseAdapter        │  ← Provider interface
                       │  (PostgresAdapter / future)  │
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                       ┌─────────────────────────────┐
                       │     ResultNormalizer         │  ← Unified output
                       └──────────────┬────────────────┘
                                      │
                                      ▼
                              QueryResult (contract)
```

---

## 4. Shared Data Contract

Every execution path — raw query or preview — ultimately produces a single normalized shape.

```typescript
// Input shape accepted by POST /query
export interface QueryInput {
  namespace: string;
  query: string;
  limit?: number;       // Soft row cap, defaults to MAX_ROWS_DEFAULT
  offset?: number;      // For pagination
  timeout?: number;     // Query timeout in ms, defaults to QUERY_TIMEOUT_DEFAULT
}

// Universal output shape
export interface QueryResult {
  columns: string[];             // Ordered column/field names
  rows: Record<string, unknown>[];  // Normalized rows (JSON-safe values only)
  totalCount: number;            // Total matching rows (for pagination UI)
  timeMs: number;                // Wall-clock execution time
  truncated: boolean;            // True if row cap was applied
}
```

`totalCount` is returned separately from `rows.length` so the UI can correctly render pagination without needing a second request. Adapters are responsible for supplying this (e.g., via `COUNT(*)` in a subquery for Postgres, or `estimatedDocumentCount()` for Mongo).

---

## 5. Execution Flow — Raw Query (`POST /query`)

```
1. Controller receives { namespace, query, limit?, timeout? }
2. QueryService.executeRaw(datasourceId, input) is called
3. SafetyGuard.validate(query) → throws if blocked pattern detected
4. ConnectionManager.getAdapter(datasourceId) → returns ready DatabaseAdapter
5. adapter.query(input) executes against the driver
6. ResultNormalizer.normalize(rawResult) → produces QueryResult
7. Controller returns QueryResult
```

### 5.1 Safety Guard

The SafetyGuard is a pure stateless validator — no I/O. It runs before any connection is acquired.

```typescript
// Default blocked patterns (configurable per datasource)
const BLOCKED_PATTERNS = [
  /^\s*DROP\s/i,
  /^\s*TRUNCATE\s/i,
  /^\s*ALTER\s/i,
  /^\s*DELETE\s+FROM\s/i,  // DELETE without WHERE
];

// Future: per-datasource override via DatabaseConnection.allowDangerousQueries flag
export class SafetyGuard {
  validate(query: string, options?: { allowDangerous?: boolean }): void {
    if (options?.allowDangerous) return;
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(query)) {
        throw new ForbiddenQueryException(query);
      }
    }
  }
}
```

This is intentionally simple now. When the Visual Query Builder ships, it will always emit safe ASTs and bypass the SafetyGuard entirely — the guard is only for raw SQL input.

---

## 6. Execution Flow — Entity Preview (`GET /preview`)

Preview is a specialized query that wraps an entity in a paginated `SELECT *`. It shares the same downstream pipeline as raw query execution.

```
1. Controller receives { datasourceId, namespace, entity, page?, pageSize? }
2. QueryService.previewEntity(datasourceId, namespace, entity, pagination) is called
3. PreviewBuilder.build(namespace, entity, pagination) → produces a QueryInput
4. (No SafetyGuard — system-generated query, inherently safe)
5. ConnectionManager.getAdapter(datasourceId) → ready adapter
6. adapter.query(queryInput) executes
7. ResultNormalizer.normalize(rawResult) → QueryResult
8. Controller returns QueryResult
```

### 6.1 PreviewBuilder

```typescript
export class PreviewBuilder {
  build(namespace: string, entity: string, pagination: PaginationParams): QueryInput {
    const { page = 1, pageSize = 50 } = pagination;
    const offset = (page - 1) * pageSize;

    return {
      namespace,
      // Adapter translates this to provider syntax:
      // Postgres → SELECT * FROM "namespace"."entity" LIMIT x OFFSET y
      // Mongo    → db.entity.find({}).skip(offset).limit(limit)
      query: `SELECT * FROM "${namespace}"."${entity}"`,
      limit: pageSize,
      offset,
    };
  }
}
```

The adapter is responsible for translating the query + limit/offset into provider-correct syntax. The PreviewBuilder does not emit raw paginated SQL — that would tie it to a single provider.

---

## 7. Result Normalizer

The ResultNormalizer converts a raw driver result (whatever shape the driver returns) into the unified `QueryResult`. This is an adapter-level concern — each adapter implements its own normalization — but all must conform to the same output shape.

### 7.1 Value Normalization Rules

| Raw Type | Normalized Output |
|----------|-------------------|
| `Date` | ISO 8601 string (`toISOString()`) |
| `BigInt` | String (avoids JSON overflow) |
| `Buffer` / `Uint8Array` | Hex string prefixed with `0x` |
| `null` / `undefined` | `null` |
| `boolean` | `boolean` (preserved) |
| `number` | `number` (preserved) |
| `object` / `Array` | JSON-stringified (nested objects stay readable) |
| `string` | `string` (preserved) |

```typescript
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'bigint') return value.toString();
  if (Buffer.isBuffer(value)) return '0x' + value.toString('hex');
  if (typeof value === 'object') return JSON.parse(JSON.stringify(value));
  return value;
}
```

### 7.2 Column Extraction

Column names are extracted from the first row's keys (or from driver-provided metadata when available). The order must be stable — adapters should return ordered column metadata rather than relying on object key order.

---

## 8. Adapter Interface — Query Method

The `DatabaseAdapter` interface defines the contract each provider must implement. The query method:

```typescript
export interface DatabaseAdapter {
  // ...other methods

  query(input: QueryInput): Promise<RawQueryResult>;
}

// Internal shape before normalization
export interface RawQueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  totalCount: number;
}
```

The adapter owns:
- Connection pool acquisition
- Query timeout enforcement
- Provider-specific pagination syntax (LIMIT/OFFSET vs skip/limit vs ROWNUM)
- Row cap enforcement (never return more than `MAX_ROWS_HARD_CAP` regardless of input)
- Calling `normalizeValue` on each cell before returning

---

## 9. Configuration Constants

These live in a shared config module and are never hardcoded in service logic:

```typescript
export const QUERY_CONFIG = {
  MAX_ROWS_DEFAULT: 1000,     // Default soft cap if client omits limit
  MAX_ROWS_HARD_CAP: 10_000,  // Absolute ceiling, adapter enforces this
  QUERY_TIMEOUT_DEFAULT: 30_000, // 30s default
  QUERY_TIMEOUT_MAX: 120_000,    // 2 minute ceiling
  PREVIEW_PAGE_SIZE_DEFAULT: 50,
  PREVIEW_PAGE_SIZE_MAX: 500,
};
```

---

## 10. Error Handling

All query errors are mapped to typed exceptions before leaving the service layer:

```typescript
// Thrown by SafetyGuard
class ForbiddenQueryException extends BadRequestException { ... }

// Thrown by adapter on DB-level errors
class QueryExecutionException extends InternalServerErrorException {
  constructor(message: string, public readonly providerError: unknown) { super(message); }
}

// Thrown when query exceeds timeout
class QueryTimeoutException extends RequestTimeoutException { ... }
```

The controller catches these and returns appropriate HTTP status codes. The client (`QueryEditor.tsx`) already handles `executionState: "error"` and displays the `errorMessage` — the backend should always return a human-readable `message` in the error body.

---

## 11. Extension Points

### 11.1 Query History (Phase 2)

After normalization succeeds, the service can fire-and-forget a `QueryHistoryService.record(...)` call. No changes to the core execution path.

```typescript
// Non-blocking — never delays response
this.queryHistory.record(datasourceId, input, result).catch(() => {});
```

Schema addition needed in `schema.prisma`:
```prisma
model QueryHistory {
  id           String   @id @default(cuid())
  datasourceId String
  query        String
  namespace    String
  rowCount     Int
  timeMs       Int
  executedAt   DateTime @default(now())
}
```

### 11.2 Export (Phase 2)

A dedicated `ExportService` wraps `QueryService.executeRaw` and streams results through a format encoder (CSV, JSON, Parquet). The query contract doesn't change — the export layer handles chunking via repeated paginated calls.

### 11.3 AST-Based Query Builder (Phase 2)

The Query Builder Engine will compile a `QueryAST` to a `QueryInput` and feed it directly into the existing execution pipeline. The builder bypasses the SafetyGuard entirely since AST → SQL is always deterministic and safe.

```typescript
// Future QueryAST shape
export interface QueryAST {
  from: { namespace: string; entity: string };
  select: string[];   // [] means SELECT *
  joins: JoinClause[];
  filters: FilterClause[];
  orderBy: OrderClause[];
  limit?: number;
  offset?: number;
}

// Compiler entry point (future)
export class SqlCompiler {
  compile(ast: QueryAST, dialect: DatabaseDialect): QueryInput { ... }
}

// Dialect tells the compiler which SQL flavor to emit
export type DatabaseDialect = 'postgres' | 'mysql' | 'sqlite' | 'mongo-aggregation';
```

Join inference uses BFS over the `SchemaGraph` (built from foreign key metadata returned by `getAllEntitySchema`):

```typescript
export class JoinInferenceEngine {
  // Finds shortest join path between two entities using FK relationships
  findJoinPath(graph: SchemaGraph, from: string, to: string): JoinPath[];
}
```

### 11.4 AI Integration (Phase 3)

AI sits entirely above the query engine and produces a `QueryAST`, never raw SQL. This ensures every AI-generated query goes through the same validation, compilation, and normalization pipeline as user-built queries.

```
NL Prompt → AI Layer → QueryAST → SqlCompiler → QueryInput → QueryService → QueryResult
```

The AI layer never touches the adapter or the connection. This is a hard architectural boundary.

---

## 12. Module Structure

```text
src/
  query/
    query.controller.ts       # HTTP endpoints, request parsing
    query.service.ts          # Orchestration: guard → adapter → normalize
    query.module.ts
    dto/
      execute-query.dto.ts    # Validates POST /query body
      preview-query.dto.ts    # Validates GET /preview params
    lib/
      safety-guard.ts         # Pattern-based query validator
      preview-builder.ts      # Builds paginated QueryInput from entity + pagination
      result-normalizer.ts    # Value-level normalization utilities
    types/
      query-input.ts
      query-result.ts
      query-ast.ts            # Stub for Phase 2
    exceptions/
      forbidden-query.exception.ts
      query-execution.exception.ts
      query-timeout.exception.ts
    history/                  # Phase 2 — wire in without touching core
      query-history.service.ts
      query-history.module.ts
```

---

## 13. Sequence Diagram — Full Raw Query Flow

```
Client          QueryController     QueryService      SafetyGuard    ConnectionManager    PostgresAdapter    ResultNormalizer
  │                   │                  │                  │                │                   │                  │
  │── POST /query ───▶│                  │                  │                │                   │                  │
  │                   │── executeRaw() ─▶│                  │                │                   │                  │
  │                   │                  │── validate() ───▶│                │                   │                  │
  │                   │                  │◀─ ok / throws ───│                │                   │                  │
  │                   │                  │── getAdapter() ──────────────────▶│                   │                  │
  │                   │                  │◀─ adapter ────────────────────────│                   │                  │
  │                   │                  │── adapter.query() ────────────────────────────────────▶│                 │
  │                   │                  │◀─ RawQueryResult ─────────────────────────────────────│                 │
  │                   │                  │── normalize() ────────────────────────────────────────────────────────▶ │
  │                   │                  │◀─ QueryResult ─────────────────────────────────────────────────────────│
  │                   │◀─ QueryResult ───│                  │                │                   │                  │
  │◀─ 200 response ───│                  │                  │                │                   │                  │
```

---

## 14. What Was Kept From the Draft, What Was Changed

The original design document had several strong ideas that are preserved here:

- The `DatabaseDriver` interface → preserved and renamed `DatabaseAdapter` to match the existing architecture
- Safety layer blocking DROP/TRUNCATE/ALTER → preserved and formalized as `SafetyGuard`
- Pagination via LIMIT/OFFSET → preserved in `PreviewBuilder`
- Max row cap and query timeout as explicit config → preserved in `QUERY_CONFIG`
- AST → SQL compiler concept for the query builder → preserved as a Phase 2 extension point
- AI outputting AST (not raw SQL) → preserved as a Phase 3 boundary

What was corrected or improved:

- `DatabaseDriver` terminology unified with existing `DatabaseAdapter` interface (no parallel abstraction)
- `listSchemas` / `listTables` removed from the query interface — those belong to `ExplorerService` and `EntityService` per the existing architecture
- `QueryResult` shape unified with what `QueryEditor.tsx` and `TableView.tsx` already consume (`columns`, `rows`, `totalCount`, `timeMs`)
- `totalCount` made explicit as an adapter responsibility (not a post-hoc COUNT query)
- Error types formalized as typed NestJS exceptions instead of generic errors
- Module directory structure defined to match existing `src/` conventions
- Preview flow decoupled from SafetyGuard (system-generated queries don't need pattern matching)
- Join inference engine scoped to Phase 2, tied to `SchemaGraph` from existing schema data