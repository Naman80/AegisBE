import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller.js';
import { SchemaService } from './schema.service.js';
import { DatabaseAdaptersModule } from '../database-adapters/database-adapters.module.js';
import { ConnectionsModule } from '../connections/connections.module.js';

@Module({
  imports: [DatabaseAdaptersModule, ConnectionsModule],
  controllers: [SchemaController],
  providers: [SchemaService],
})
export class SchemaModule {}
