import { Controller, Get, Param, Query } from '@nestjs/common';
import { IntrospectionService } from './introspection.service.js';

@Controller('introspection')
export class IntrospectionController {
  constructor(private readonly introspectionService: IntrospectionService) {}

  @Get('schemas')
  listSchemas() {
    return this.introspectionService.listSchemas();
  }

  @Get('tables')
  listTables(@Query('schema') schema = 'public') {
    return this.introspectionService.listTables(schema);
  }

  @Get('tables/:schema/:table')
  getTableDetails(
    @Param('schema') schema: string,
    @Param('table') table: string,
  ) {
    return this.introspectionService.getTableDetails(schema, table);
  }
}
