import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../connections/connections.module.js';
import { DatabaseAdaptersModule } from '../database-adapters/database-adapters.module.js';
import { IntrospectionController } from './introspection.controller.js';
import { IntrospectionService } from './introspection.service.js';

@Module({
  imports: [ConnectionsModule, DatabaseAdaptersModule],
  controllers: [IntrospectionController],
  providers: [IntrospectionService],
})
export class IntrospectionModule {}
