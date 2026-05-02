import { Module } from '@nestjs/common';
import { DatabaseFactory } from './database.factory.js';
import { PostgresAdapter } from '../postgres/postgres.adapter.js';

@Module({
  providers: [DatabaseFactory, PostgresAdapter],
  exports: [DatabaseFactory, PostgresAdapter],
})
export class DatabaseProvidersModule {}
