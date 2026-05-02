import { Module } from '@nestjs/common';
import { ExplorerController } from './explorer.controller.js';
import { ExplorerService } from './explorer.service.js';
import { DatasourceModule } from '../datasource/datasource.module.js';

@Module({
  imports: [DatasourceModule],
  controllers: [ExplorerController],
  providers: [ExplorerService],
})
export class ExplorerModule {}
