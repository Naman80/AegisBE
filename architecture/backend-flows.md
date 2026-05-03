# AegisBE — Core Execution Flows

This document describes the exact sequence of operations and API endpoints for the primary features of the backend.

---

## 1. Connection Resolution & Lifecycle
This flow describes how any domain service retrieves a ready-to-use database connection.

### Related Endpoints
- `GET /datasources`: List all registered connections.
- `POST /datasources`: Register a new connection.
- `GET /datasources/:id`: Retrieve details for a specific connection.
- `PATCH /datasources/:id`: Update connection credentials/config.
- `DELETE /datasources/:id`: Remove a connection.
- `POST /datasources/:id/activate`: Explicitly trigger connection initialization and caching.

### Execution Sequence
1.  **Request**: A Domain Service calls `ConnectionManager.getAdapter(datasourceId)`.
2.  **Cache Check**: `ConnectionManager` checks its internal `activeAdapters` Map.
3.  **Config Retrieval**: If not cached, it calls `DatasourceService.getDatasource(id)` to fetch credentials.
4.  **Adapter Creation**: It calls `DatabaseFactory.getAdapter(type)`, returning a provider-specific instance (e.g., `PostgresAdapter`).
5.  **Initialization**: `ConnectionManager` calls `adapter.connect(config)`.
6.  **Caching**: The connected adapter is stored in the `activeAdapters` map.
7.  **Return**: The active `DatabaseAdapter` is returned to the Domain Service.

---

## 2. Metadata Exploration (Discovery)
How the system discovers the structural hierarchy of a datasource.

### Related Endpoints
- `GET /datasources/:id/namespaces`: List all schemas or databases.
- `GET /datasources/:id/namespaces/:ns/entities`: List all tables or collections within a namespace.

### Execution Sequence
1.  **Trigger**: Frontend calls the Explorer endpoints during navigation.
2.  **Adapter Fetch**: `ExplorerService` retrieves the active adapter.
3.  **Provider Discovery**:
    - **Postgres**: Queries `information_schema.schemata` and `information_schema.tables`.
    - **Mongo**: Calls `db.admin().listDatabases()` and `db.listCollections()`.
4.  **Normalization**: Results are converted into a unified `Namespace[]` or `Entity[]` array.

---

## 3. Unified Schema Exploration (Bulk)
Powers the "instant" navigation by pre-loading a namespace's full structure.

### Related Endpoints
- `GET /datasources/:id/namespaces/:ns/entities/schema/all`: Fetch all entity schemas for a namespace.

### Execution Sequence
1.  **Trigger**: The UI selects a namespace and requests full metadata.
2.  **Service**: `EntityService.getAllEntitySchema` is invoked.
3.  **Adapter Execution**: The adapter executes a bulk metadata join (e.g., columns + tables).
4.  **Normalization**:
    - Maps database-specific types to Aegis normalized types.
    - Identifies entity types (`table` vs `view`).
5.  **Aggregation**: Data is grouped into a `Record<string, { type: string, fields: Field[] }>`.
6.  **Instant UI**: The frontend caches this result to allow zero-latency table exploration.

---

## 4. Entity Lifecycle Operations (DDL)
How structural changes are executed through the unified interface.

### Related Endpoints
- `GET /datasources/:id/namespaces/:ns/entities/:entity/schema`: Get field metadata for a single entity.
- `POST /datasources/:id/namespaces/:ns/entities`: Create a new table/collection.
- `PATCH /datasources/:id/namespaces/:ns/entities/:entity`: Alter an existing entity structure.
- `DELETE /datasources/:id/namespaces/:ns/entities/:entity`: Drop an entity.

### Execution Sequence
1.  **Trigger**: DDL actions from the Schema Builder.
2.  **Service**: `EntityService` routes to the adapter.
3.  **Translation**: The adapter translates normalized `Field` definitions into provider SQL/Commands (e.g., `CREATE TABLE` vs `db.createCollection`).
4.  **Execution**: Native driver executes the command.
5.  **Response**: Returns success/failure to the UI.

---

## 5. Query & Preview Execution
The pipeline for data retrieval and result normalization.

### Related Endpoints
- `POST /datasources/:id/query`: Execute raw SQL or provider commands.
- `GET /datasources/:id/namespaces/:ns/entities/:entity/preview`: Paginated record browsing.

### Execution Sequence
1.  **Trigger**: 
    - `POST /query`: User-submitted raw query.
    - `GET /preview`: Automated paginated browse request.
2.  **Service Processing**:
    - For `preview`, `QueryService` wraps the entity in a standard paginated query (e.g., `SELECT * ... LIMIT x OFFSET y`).
3.  **Adapter Execution**: The adapter runs the query and captures raw result metadata.
4.  **Normalization**:
    - **Header Mapping**: Extracting column/field names.
    - **Value Formatting**: Converting native objects (Dates, BigInts) into JSON-safe strings/numbers.
5.  **Response**: Returns a standardized `QueryResult` containing `columns`, `rows`, and `totalCount`.

---

## 6. Global Cleanup
Ensures graceful shutdown of database connections.

### Execution Sequence
1.  **Trigger**: NestJS `OnModuleDestroy` hook in `ConnectionManager`.
2.  **Iteration**: Loops through the `activeAdapters` cache.
3.  **Disconnection**: Calls `adapter.disconnect()` for every cached instance, closing underlying pools.
4.  **Process Exit**: Once all connections are closed, the server process exits safely.
