import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryService } from './query.service.js';

@Controller('datasources/:id')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('query')
  executeQuery(
    @Param('id') id: string,
    @Body() input: {
      namespace: string;
      entity?: string;
      query: string;
      limit?: number;
      offset?: number;
    }
  ) {
    return this.queryService.executeQuery(id, input);
  }

  @Get('namespaces/:namespace/entities/:entity/preview')
  previewEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number
  ) {
    return this.queryService.previewEntity(id, namespace, entity, limit, offset);
  }
}
