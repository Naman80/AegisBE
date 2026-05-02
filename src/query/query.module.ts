import { Module } from '@nestjs/common';
import { QueryController } from './query.controller.js';
import { QueryService } from './query.service.js';
import { DatasourceModule } from '../datasource/datasource.module.js';

@Module({
  imports: [DatasourceModule],
  controllers: [QueryController],
  providers: [QueryService],
})
export class QueryModule {}
