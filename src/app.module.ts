import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';

// Core Architecture Modules
import { DatabaseProvidersModule } from './providers/database/database-providers.module.js';
import { DatasourceModule } from './datasource/datasource.module.js';
import { ExplorerModule } from './explorer/explorer.module.js';
import { SchemaModule } from './schema/schema.module.js';
import { QueryModule } from './query/query.module.js';

@Module({
  imports: [
    PrismaModule,
    
    // Core Domain Modules
    DatabaseProvidersModule,
    DatasourceModule,
    ExplorerModule,
    SchemaModule,
    QueryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
