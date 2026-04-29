import { Controller, Get, Param, Query } from '@nestjs/common';
import { TableBrowserService } from './table-browser.service.js';

@Controller('tables')
export class TableBrowserController {
  constructor(private readonly tableBrowserService: TableBrowserService) {}

  @Get(':schema/:table/rows')
  previewRows(
    @Param('schema') schema: string,
    @Param('table') table: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tableBrowserService.previewRows(
      schema,
      table,
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined,
    );
  }
}
