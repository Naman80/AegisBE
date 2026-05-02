import { Controller, Get, Param } from '@nestjs/common';
import { ExplorerService } from './explorer.service.js';

@Controller('datasources/:id/namespaces')
export class ExplorerController {
  constructor(private readonly explorerService: ExplorerService) {}

  @Get()
  listNamespaces(@Param('id') id: string) {
    return this.explorerService.listNamespaces(id);
  }

  @Get(':namespace/entities')
  listEntities(
    @Param('id') id: string,
    @Param('namespace') namespace: string
  ) {
    return this.explorerService.listEntities(id, namespace);
  }
}
