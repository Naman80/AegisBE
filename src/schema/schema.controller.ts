import { Body, Controller, Delete, Param, Patch, Post, Query } from '@nestjs/common';
import { SchemaService } from './schema.service.js';
import { CreateTableDto, AlterTableDto } from '../database-adapters/interfaces/database-adapter.interface.js';

@Controller('schema')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Post('tables')
  createTable(
    @Query('schema') schema = 'public',
    @Body() table: CreateTableDto
  ) {
    return this.schemaService.createTable(schema, table);
  }

  @Patch('tables/:table')
  alterTable(
    @Param('table') table: string,
    @Query('schema') schema = 'public',
    @Body() changes: AlterTableDto
  ) {
    return this.schemaService.alterTable(schema, table, changes);
  }

  @Delete('tables/:table')
  dropTable(
    @Param('table') table: string,
    @Query('schema') schema = 'public'
  ) {
    return this.schemaService.dropTable(schema, table);
  }
}
