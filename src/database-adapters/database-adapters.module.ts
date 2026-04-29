import { Module } from '@nestjs/common';
import { DatabaseAdapterService } from './database-adapter.service.js';
import { PostgresAdapter } from './postgres/postgres.adapter.js';

@Module({
  providers: [DatabaseAdapterService, PostgresAdapter],
  exports: [DatabaseAdapterService],
})
export class DatabaseAdaptersModule {}
