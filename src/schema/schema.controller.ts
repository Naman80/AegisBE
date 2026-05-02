import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { SchemaService } from './schema.service.js';
import type { AlterEntityDto, EntityFieldDefinition } from '../providers/database/database.interface.js';

@Controller('datasources/:id/namespaces/:namespace/entities')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get('schema/bulk')
  getBulkSchema(
    @Param('id') id: string,
    @Param('namespace') namespace: string
  ) {
    return this.schemaService.getBulkSchema(id, namespace);
  }

  @Get(':entity/schema')
  getEntitySchema(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string
  ) {
    return this.schemaService.getEntitySchema(id, namespace, entity);
  }

  @Post()
  createEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Body() body: { name: string; fields: EntityFieldDefinition[] }
  ) {
    return this.schemaService.createEntity(id, namespace, body.name, body.fields);
  }

  @Patch(':entity')
  alterEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string,
    @Body() changes: AlterEntityDto
  ) {
    return this.schemaService.alterEntity(id, namespace, entity, changes);
  }

  @Delete(':entity')
  dropEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string
  ) {
    return this.schemaService.dropEntity(id, namespace, entity);
  }
}
