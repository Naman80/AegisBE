import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { EntityService } from './entity.service.js';
import type { AlterEntityDto, EntityFieldDefinition } from '../providers/database/database.interface.js';

@Controller('datasources/:id/namespaces/:namespace/entities')
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Get('schema/all')
  getAllEntitySchema(
    @Param('id') id: string,
    @Param('namespace') namespace: string
  ) {
    return this.entityService.getAllEntitySchema(id, namespace);
  }

  @Get(':entity/schema')
  getEntitySchema(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string
  ) {
    return this.entityService.getEntitySchema(id, namespace, entity);
  }

  @Post()
  createEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Body() body: { name: string; fields: EntityFieldDefinition[] }
  ) {
    return this.entityService.createEntity(id, namespace, body.name, body.fields);
  }

  @Patch(':entity')
  alterEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string,
    @Body() changes: AlterEntityDto
  ) {
    return this.entityService.alterEntity(id, namespace, entity, changes);
  }

  @Delete(':entity')
  dropEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string
  ) {
    return this.entityService.dropEntity(id, namespace, entity);
  }
}
