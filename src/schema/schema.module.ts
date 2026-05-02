import { Module } from '@nestjs/common';
import { SchemaController } from './schema.controller.js';
import { SchemaService } from './schema.service.js';
import { DatasourceModule } from '../datasource/datasource.module.js';

@Module({
  imports: [DatasourceModule],
  controllers: [SchemaController],
  providers: [SchemaService],
})
export class SchemaModule {}
