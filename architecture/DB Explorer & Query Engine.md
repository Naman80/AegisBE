# DB Explorer & Query Engine — Design Document

## 1. Objective

Build a production-grade **multi-database explorer and query engine** that enables:
- Schema introspection
- SQL query execution
- Visual query building (non-AI)
- Extensible architecture for future AI integration

Key principles:
- Deterministic behavior
- Strong abstractions
- Extensible driver system
- Performance-aware

---

## 2. High-Level Architecture

Frontend (React)
↓
API Layer (NestJS)
↓
Core Engine
├── Query Engine
├── Schema Engine
├── Query Builder Engine (AST-based)
└── Driver Layer (DB-specific)

---

## 3. Core Backend Modules

### 3.1 Datasource Module

Manages database connections and configurations.

type Datasource = {
  id: string
  type: "postgres" | "mysql"
  connectionConfig: {
    host: string
    port: number
    username: string
    password: string
    database: string
  }
}

Responsibilities:

* Store datasource configs
* Validate connections
* Manage lifecycle

### 3.2 Driver Layer (Abstraction Layer)

Defines a unified interface for all databases.

interface DatabaseDriver {
  connect(): Promise<void>
  disconnect(): Promise<void>
  listSchemas(): Promise<string[]>
  listTables(schema: string): Promise<string[]>
  getTableMetadata(table: string): Promise<TableMeta>
  execute(query: string, options?): Promise<QueryResult>
}

Implementations:
* PostgresDriver (current)
* MySQLDriver (future)

⸻

### 3.3 Query Engine

Handles execution lifecycle of SQL queries.

Input:
{
  datasourceId: string
  query: string
  limit?: number
  timeout?: number
}

{
  columns: { name: string; type: string }[]
  rows: any[][]
  executionTime: number
  rowCount: number
}

Responsibilities:

* Acquire connection (pooling)
* Execute query
* Handle timeout
* Normalize output
* Apply row limits

⸻

### 3.4 Schema Engine

Builds structured representation of database schema.

type Column = {
  name: string
  type: string
  nullable: boolean
  default?: any
}

type ForeignKey = {
  fromTable: string
  fromColumn: string
  toTable: string
  toColumn: string
}

type TableMeta = {
  name: string
  columns: Column[]
  primaryKey?: string[]
  foreignKeys: ForeignKey[]
  indexes: string[]
}

### 3.5 Schema Graph

Internal graph representation of database relationships.

type SchemaGraph = {
  tables: Map<string, TableMeta>
  edges: ForeignKey[]
}

Used for:

* Join inference
* Query builder
* Graph visualization

⸻

### 3.6 Query Builder Engine (Non-AI)

Core idea: AST-based query system

type QueryAST = {
  from: string
  joins: Join[]
  select: string[]
  filters: Filter[]
  orderBy?: Order[]
  limit?: number
}

### 3.7 SQL Compiler

Converts AST → SQL

function compileToSQL(ast: QueryAST): string
Benefits:
* Safe query generation
* DB portability
* Debuggable logic

### 3.8 Join Inference Engine

Automatically determines relationships between tables.

function findJoinPath(from: string, to: string): JoinPath[]

Implementation:

* Graph traversal (BFS)
* Supports:
    * Direct joins
    * Multi-hop joins

4. API Design

### 4.1 Query Execution
POST /query/execute

### 4.2 Schema APIs
GET /schemas
GET /tables?schema=public
GET /table/:name/meta

### 4.3 Query Builder
POST /query/compile

### 5. Frontend Architecture

### 5.1 Core Views

Schema Explorer

* Sidebar: schemas → tables
* Main: table preview + metadata

⸻

Query Editor

* SQL input
* Run execution
* Result grid
* Execution stats

⸻

Visual Query Builder

* Select table
* Auto joins
* Filters
* Generated SQL preview

⸻

Schema Graph Viewer

* Nodes: tables
* Edges: foreign keys
* Interactive exploration

### 6. Execution Flow

SQL Execution

User → API → Query Engine → Driver → Database
                                ↓
                           Result Set
                                ↓
                         Normalize Output
                                ↓
                              UI

Query Builder Flow

User Input → AST Builder → AST → SQL Compiler → Query Engine → Result

### 7. Safety Layer

Prevent destructive queries by default.

Blocked:

* DROP
* TRUNCATE
* ALTER

Optional override flag:
allowDangerousQueries: boolean

### 8. Performance Considerations

* Pagination (LIMIT/OFFSET)
* Max row cap
* Query timeout
* Connection pooling
* Lazy metadata loading

⸻

### 9. Connection Management

* Use pooling (per datasource)
* Handle idle connections
* Retry transient failures
* Max connection guard

⸻

### 10. Extensibility Design

To add new DB:

1. Implement DatabaseDriver
2. Map types → generic types
3. Plug into driver factory

⸻

### 11. Future Enhancements (Phase 2+)

Query Features

* Saved queries
* Query history
* Export (CSV/JSON)

⸻

Data Editing

* Inline editing
* Row insert/delete
* Bulk operations

⸻

Observability

* Query logs
* Execution metrics
* Slow query detection

⸻

### 12. AI Integration (Later Phase)

AI should sit on top of deterministic system.

Add:

* Natural language → QueryAST
* Query explanation
* Query optimization suggestions

Important:

* AI outputs AST, not raw SQL
* Always validate before execution