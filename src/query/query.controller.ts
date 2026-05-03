import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { QueryService } from './query.service.js';
import { ExecuteQueryDto } from './dto/execute-query.dto.js';
import { PreviewQueryDto } from './dto/preview-query.dto.js';
import { QueryResult } from './types/query.types.js';

@Controller('datasources/:id')
export class QueryController {
  constructor(private readonly queryService: QueryService) {}

  @Post('query')
  executeQuery(
    @Param('id') id: string,
    @Body() input: ExecuteQueryDto
  ): Promise<QueryResult> {
    return this.queryService.executeQuery(id, input);
  }

  @Get('namespaces/:namespace/entities/:entity/preview')
  previewEntity(
    @Param('id') id: string,
    @Param('namespace') namespace: string,
    @Param('entity') entity: string,
    @Query() pagination: PreviewQueryDto
  ): Promise<QueryResult> {
    return this.queryService.previewEntity(id, namespace, entity, pagination);
  }
}
