import { Module } from '@nestjs/common';
import { EntityController } from './entity.controller.js';
import { EntityService } from './entity.service.js';
import { DatasourceModule } from '../datasource/datasource.module.js';

@Module({
  imports: [DatasourceModule],
  controllers: [EntityController],
  providers: [EntityService],
})
export class EntityModule {}
