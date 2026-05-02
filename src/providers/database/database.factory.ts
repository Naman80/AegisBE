import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DatabaseAdapter } from './database.interface.js';
import { PostgresAdapter } from '../postgres/postgres.adapter.js';

@Injectable()
export class DatabaseFactory {
  constructor(private moduleRef: ModuleRef) {}

  async getAdapter(type: 'postgres' | 'mongodb' | 'mysql'): Promise<DatabaseAdapter> {
    switch (type) {
      case 'postgres':
        return this.moduleRef.resolve(PostgresAdapter);
      case 'mongodb':
        throw new InternalServerErrorException('MongoDB support not implemented yet');
      case 'mysql':
        throw new InternalServerErrorException('MySQL support not implemented yet');
      default:
        throw new InternalServerErrorException(`Unsupported database type: ${type}`);
    }
  }
}
