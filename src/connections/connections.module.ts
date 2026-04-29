import { Module } from '@nestjs/common';
import { DatabaseAdaptersModule } from '../database-adapters/database-adapters.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { ConnectionsController } from './connections.controller.js';
import { ConnectionsService } from './connections.service.js';

@Module({
  imports: [PrismaModule, DatabaseAdaptersModule],
  controllers: [ConnectionsController],
  providers: [ConnectionsService],
  exports: [ConnectionsService],
})
export class ConnectionsModule {}
