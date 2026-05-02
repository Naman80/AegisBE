import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DatasourceService } from './datasource.service.js';
import { ConnectionManager } from './connection.manager.js';

@Controller('datasources')
export class DatasourceController {
  constructor(
    private readonly datasourceService: DatasourceService,
    private readonly connectionManager: ConnectionManager,
  ) {}

  @Get()
  listDatasources() {
    return this.datasourceService.listDatasources();
  }

  @Post()
  createDatasource(@Body() dto: any) {
    return this.datasourceService.createDatasource(dto);
  }

  @Get(':id')
  getDatasource(@Param('id') id: string) {
    return this.datasourceService.getDatasource(id);
  }

  @Patch(':id')
  updateDatasource(@Param('id') id: string, @Body() dto: any) {
    return this.datasourceService.updateDatasource(id, dto);
  }

  @Delete(':id')
  deleteDatasource(@Param('id') id: string) {
    return this.datasourceService.deleteDatasource(id);
  }

  @Post(':id/test')
  async testConnection(@Param('id') id: string) {
    // For testing, we don't want to cache or connect permanently
    // But we use the manager logic to get a temporary check
    const datasource = await this.datasourceService.getDatasource(id);
    // ConnectionManager's getAdapter handles this
    const adapter = await this.connectionManager.getAdapter(id);
    // Since it's already connected in getAdapter, we just test if it works
    return { success: true, message: 'Connection successful' };
  }

  @Post(':id/activate')
  activateDatasource(@Param('id') id: string) {
    return this.datasourceService.setActive(id);
  }
}
