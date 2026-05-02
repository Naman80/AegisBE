import { Module } from '@nestjs/common';
import { DatasourceController } from './datasource.controller.js';
import { DatasourceService } from './datasource.service.js';
import { ConnectionManager } from './connection.manager.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DatabaseProvidersModule } from '../providers/database/database-providers.module.js';

@Module({
  imports: [PrismaModule, DatabaseProvidersModule],
  controllers: [DatasourceController],
  providers: [DatasourceService, ConnectionManager],
  exports: [DatasourceService, ConnectionManager],
})
export class DatasourceModule {}
