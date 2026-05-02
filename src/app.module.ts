import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { IntrospectionModule } from './introspection/introspection.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TableBrowserModule } from './table-browser/table-browser.module.js';

// New Architecture Modules
import { DatabaseProvidersModule } from './providers/database/database-providers.module.js';
import { DatasourceModule } from './datasource/datasource.module.js';
import { ExplorerModule } from './explorer/explorer.module.js';
import { SchemaModule as NewSchemaModule } from './schema/schema.module.js';
import { QueryModule } from './query/query.module.js';

@Module({
  imports: [
    PrismaModule,
    ConnectionsModule,
    IntrospectionModule,
    TableBrowserModule,
    
    // New Architecture
    DatabaseProvidersModule,
    DatasourceModule,
    ExplorerModule,
    NewSchemaModule,
    QueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
