# Multi-Provider Database Viewer — Core Architecture

## 1. Objective
A scalable, provider-agnostic backend (NestJS) that supports multiple database types (PostgreSQL, MongoDB, MySQL, etc.) via a unified abstraction layer. 

## 2. Core Design Principles

### 2.1 Single Responsibility Principle (SRP)
- **Adapters**: Pure driver wrappers. No business logic or persistence knowledge.
- **ConnectionManager**: Decouples connection lifecycle (pooling, caching) from domain logic.
- **DatasourceService**: Pure persistence layer for connection metadata (Prisma).
- **Domain Services**: Focus strictly on business operations (Explorer, Entity, Query).

### 2.2 Provider-Agnostic Terminology

| Generic Term | PostgreSQL | MongoDB |
|-------------|------------|---------|
| datasource  | database connection | database |
| namespace   | schema     | database |
| entity      | table      | collection |
| record      | row        | document |
| field       | column     | field |

---

## 3. High-Level Architecture Flow

`Controller (API Layer)` → `Domain Service (Business Logic)` → `ConnectionManager (Lifecycle)` → `DatabaseFactory (Resolver)` → `Adapter (Postgres/Mongo)` → `Driver`

---

## 4. Directory Structure

```text
src/
  datasource/          # Connection records & lifecycle (ConnectionManager)
  explorer/            # Metadata browsing (Namespaces/Entities)
  entity/              # Structural metadata & mutations (Entity lifecycle)
  query/               # Query execution & normalization
  providers/
    database/          # Unified interface & factory
    postgres/          # PostgreSQL implementation
  common/
    types/             # Normalized domain types
```

---

## 5. Core Interface (DatabaseAdapter)

```typescript
export interface DatabaseAdapter {
  connect(config: ConnectionConfig): Promise<void>;
  disconnect(): Promise<void>;
  
  listNamespaces(): Promise<Namespace[]>;
  listEntities(namespace: string): Promise<Entity[]>;
  
  getEntitySchema(namespace: string, entity: string): Promise<Field[]>;
  getAllEntitySchema(namespace: string): Promise<Record<string, Field[]>>;
  
  // Mutations
  createEntity(namespace: string, name: string, fields: EntityFieldDefinition[]): Promise<void>;
  alterEntity(namespace: string, name: string, changes: AlterEntityDto): Promise<void>;
  dropEntity(namespace: string, name: string): Promise<void>;
  
  query(input: QueryInput): Promise<QueryResult>;
  testConnection(config: ConnectionConfig): Promise<{ success: boolean; message: string }>;
}
```

---

## 6. Key Components

### 6.1 ConnectionManager
Handles the pool of active database connections. 
- Caches adapter instances by `datasourceId`.
- Ensures adapters are correctly connected before returning them to domain services.
- Manages graceful disconnection on module destruction.

### 6.2 Data Normalization
Each adapter is responsible for translating provider-specific data into the unified contract:
- **Types**: Mapping `varchar`/`text` → `string`, `int`/`numeric` → `number`, etc.
- **Results**: Returning a standardized `QueryResult` with `columns` and `rows`.

---

## 7. API Design

### 7.1 Datasource APIs
- `GET /datasources`: List all.
*   `POST /datasources`: Create.
*   `PATCH /datasources/:id`: Update.
*   `POST /datasources/:id/activate`: Set as global active.

### 7.2 Explorer APIs
- `GET /datasources/:id/namespaces`: List schemas/databases.
- `GET /datasources/:id/namespaces/:ns/entities`: List tables/collections.

### 7.3 Entity APIs
- `GET /datasources/:id/namespaces/:ns/entities/:entity/schema`: Get field metadata.
- `GET /datasources/:id/namespaces/:ns/entities/schema/all`: Get full schema details.
- `POST /datasources/:id/namespaces/:ns/entities`: Create new entity.
- `PATCH /datasources/:id/namespaces/:ns/entities/:entity`: Alter entity.
- `DELETE /datasources/:id/namespaces/:ns/entities/:entity`: Drop entity.

### 7.4 Query APIs
- `POST /datasources/:id/query`: Execute raw query.
- `GET /datasources/:id/namespaces/:ns/entities/:entity/preview`: Paginated row browsing.

---

## 8. Summary
This architecture ensures:
- **Extensibility**: Add MySQL, Redis, or MongoDB by implementing a new adapter.
- **Stability**: Legacy modules coexist while the new system is verified.
- **Cleanliness**: Strict SRP ensures each service is easy to test and maintain.