# Aegis Phase 1 Design

## Goal

Phase 1 makes Aegis a real read-focused database explorer for PostgreSQL:

- save and activate database connections
- test connection health
- introspect schemas, tables, columns, and foreign keys
- preview live table rows

The long-term constraint is that PostgreSQL support should be the first adapter, not a one-off implementation.

## Architecture

The backend now has two separate data responsibilities:

1. Aegis app data
   - stored through Prisma
   - currently used for saved `DatabaseConnection` records

2. User target database access
   - handled through a driver-backed adapter layer
   - currently implemented with a `PostgresAdapter` using `pg`

This separation is intentional. Prisma remains a good fit for Aegis-owned metadata, while direct adapters are better for arbitrary customer databases.

## Modules

### `connections`

Responsibilities:

- validate connection payloads
- test raw PostgreSQL connectivity
- persist saved connections
- expose and update the active connection

Main endpoints:

- `POST /connections/test`
- `POST /connections`
- `GET /connections`
- `GET /connections/active`
- `PATCH /connections/:id/activate`

### `database-adapters`

Responsibilities:

- define the database adapter contract
- resolve the correct adapter from `DatabaseType`
- isolate database-specific behavior from controllers/services

Current implementation:

- `DatabaseAdapterService`
- `PostgresAdapter`

Future adapters should implement the same interface rather than branching in controllers.

### `introspection`

Responsibilities:

- list schemas
- list tables within a schema
- return table details including columns and FK relations

Main endpoints:

- `GET /introspection/schemas`
- `GET /introspection/tables?schema=public`
- `GET /introspection/tables/:schema/:table`

### `table-browser`

Responsibilities:

- return paginated row previews for a table
- clamp pagination inputs
- keep table browsing read-only in Phase 1

Main endpoint:

- `GET /tables/:schema/:table/rows?limit=25&offset=0`

## Data Model

`DatabaseConnection` is stored in the Aegis app database with:

- `id`
- `name`
- `type`
- `host`
- `port`
- `database`
- `username`
- `password`
- `sslMode`
- `isActive`
- `createdAt`
- `updatedAt`

Notes:

- `type` is already modeled as an enum even though only `POSTGRES` is supported today.
- `password` is currently stored as plain text for implementation speed. This should be replaced with encrypted storage before production use.

## Adapter Contract

The shared adapter interface supports:

- `testConnection`
- `listSchemas`
- `listTables`
- `getTableDetails`
- `previewRows`

This gives us one stable surface for future support like MySQL, BigQuery, or Snowflake.

## Frontend Integration

Phase 1 frontend wiring now targets the backend for:

- settings connection management
- schema browsing
- table row preview

Current pages using real data:

- `Database Connections`
- `Schema`
- `Tables`

## Known Gaps

These are intentionally out of scope for this phase:

- arbitrary query execution from the editor
- schema mutations
- AI-assisted schema/query generation
- pipelines backed by real runtime execution
- credential encryption / secrets management
- multi-workspace ownership and auth

## Next Steps

Recommended follow-up work:

1. Encrypt stored connection credentials.
2. Add a `/tables/:schema/:table/count` endpoint if the frontend needs a lighter count-only path.
3. Add schema filtering and system-schema hiding rules per database type.
4. Introduce a frontend workspace-level connection store so all pages share active-connection state cleanly.
5. Start wiring the query editor to the active adapter with a read-only SQL execution path.
