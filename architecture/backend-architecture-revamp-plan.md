# Multi-Provider Database Viewer — Design Document

## 1. Objective
Design a scalable backend system (NestJS) that supports multiple database providers (e.g., PostgreSQL, MongoDB) via a unified abstraction layer. The system should allow users to:
- Register and manage data sources
- Explore database structure
- Inspect schemas
- Execute queries safely
- View records in a normalized format

---

## 2. Core Design Principles

### 2.1 Abstraction First
Decouple API and business logic from database-specific implementations.

Abstract → Adapt → Execute

- Abstract layer: Unified interface (namespaces, entities, records)
- Adapter layer: Provider-specific implementations
- Execution layer: Query handling + safety

---

### 2.2 Provider-Agnostic Terminology

| Generic Term | PostgreSQL | MongoDB |
|-------------|------------|---------|
| datasource  | database connection | database |
| namespace   | schema     | database |
| entity      | table      | collection |
| record      | row        | document |
| field       | column     | field |

This avoids leaking SQL/NoSQL semantics into APIs.

---

## 3. High-Level Architecture

Controller (API Layer)         ↓ Service Layer (Business Logic)         ↓ DatabaseFactory (Provider Resolver)         ↓ Adapter (Postgres / Mongo)         ↓ Database Driver

---

## 4. NestJS Module Structure

src/   modules/     datasource/     explorer/     schema/     query/    providers/     database/       database.interface.ts       database.factory.ts        postgres/       mongodb/    common/     dto/     types/     utils/    config/

---

## 5. Module Responsibilities

### 5.1 Datasource Module
- Create/manage DB connections
- Store credentials (encrypted)
- Lifecycle management

---

### 5.2 Explorer Module
- List namespaces
- List entities
- Browse structure

---

### 5.3 Schema Module
- Fetch entity schema
- Normalize structure across DBs

---

### 5.4 Query Module
- Execute queries
- Apply limits, pagination
- Normalize results

---

## 6. Core Interface (Critical)

ts export interface DatabaseAdapter {   connect(): Promise<void>;   disconnect(): Promise<void>;    listNamespaces(): Promise<string[]>;   listEntities(namespace: string): Promise<string[]>;    getEntitySchema(namespace: string, entity: string): Promise<any>;    query(input: QueryInput): Promise<QueryResult>; } 

---

## 7. Adapter Pattern

### Example:
PostgresAdapter implements DatabaseAdapter MongoAdapter implements DatabaseAdapter

Each adapter:
- Translates generic calls → provider-specific queries
- Normalizes output

---

## 8. Factory Pattern

ts @Injectable() export class DatabaseFactory {   getAdapter(type: 'postgres' | 'mongodb'): DatabaseAdapter {     switch (type) {       case 'postgres':         return new PostgresAdapter();       case 'mongodb':         return new MongoAdapter();     }   } } 

(Production: use DI container instead of direct instantiation)

---

## 9. API Design

### 9.1 Datasource APIs
POST   /datasources GET    /datasources GET    /datasources/:id DELETE /datasources/:id

---

### 9.2 Explorer APIs
GET /datasources/:id/namespaces GET /datasources/:id/namespaces/:ns/entities GET /datasources/:id/namespaces/:ns/entities/:entity

---

### 9.3 Schema APIs
GET /datasources/:id/namespaces/:ns/entities/:entity/schema

---

### 9.4 Query APIs
POST /datasources/:id/query

#### Request:
json {   "type": "sql | mongo",   "query": "...",   "limit": 50 } 

---

## 10. Response Normalization

### 10.1 Schema Response
json {   "fields": [     {       "name": "email",       "type": "string",       "nullable": false     }   ] } 

---

### 10.2 Query Response
json {   "columns": ["id", "email"],   "rows": [     ["1", "test@test.com"]   ] } 

---

## 11. Pagination Strategy

Unified contract:
json {   "limit": 50,   "cursor": "...",   "sort": {} } 

### Mapping:
- PostgreSQL → LIMIT/OFFSET or cursor-based
- MongoDB → limit/skip

---

## 12. Connection Management

### Requirements:
- Connection pooling
- Per-datasource caching
- Lazy initialization

### Implementation:
- Postgres → connection pool
- MongoDB → native client pool

---

## 13. Security Considerations

- Query timeout enforcement
- Result size limits
- Read-only mode (recommended default)
- Prevent destructive queries (optional parsing layer)
- Credential encryption at rest

---

## 14. Schema Normalization Layer

Each adapter must:
- Convert native schema → unified format
- Normalize types (e.g., varchar, text → string)
- Handle nullability consistently

---

## 15. Query Execution Layer

Responsibilities:
- Validate query input
- Enforce limits
- Normalize output
- Handle errors consistently

Optional future:
- Query AST parsing (for validation)
- Safe query rewriting

---

## 16. Key Design Decisions

### 16.1 Avoid DB-Specific APIs
❌ /postgres/tables  
✅ /entities

---

### 16.2 Unified Data Contract
Frontend should not care about:
- SQL vs Mongo
- Schema vs collection differences

---

### 16.3 Adapter Isolation
Each provider:
- Fully encapsulated
- Replaceable
- Independently testable

---

## 17. Future Enhancements

- Multi-tenant datasource isolation
- Query history + caching
- Role-based access control
- Schema diffing / migrations
- Streaming large query results
- WebSocket-based live updates

---

## 18. Risks & Pitfalls

### 18.1 Abstraction Leakage
If SQL concepts leak into APIs → Mongo support breaks.

---

### 18.2 Large Data Handling
- Need streaming / chunking
- Avoid loading full datasets in memory

---

### 18.3 Schema Drift (MongoDB)
- Must handle inconsistent document shapes

---

### 18.4 Query Safety
- Unrestricted queries = production risk

---

## 19. Summary

This system is fundamentally:

- Adapter-driven
- Provider-agnostic
- Schema-normalized

Core success factors:
1. Clean abstraction layer
2. Consistent API contracts
3. Strong connection management
4. Safe query execution

---

## 20. Final Mental Model

User Request     ↓ Unified API     ↓ Service Layer     ↓ Database Factory     ↓ Adapter (Postgres / Mongo)     ↓ Database     ↓ Normalized Response

---

This design ensures:
- Extensibility (add MySQL, Redis later)
- Maintainability
- Clean separation of concerns
- Production readiness