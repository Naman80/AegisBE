import { Module } from '@nestjs/common';
import { ConnectionsModule } from '../connections/connections.module.js';
import { DatabaseAdaptersModule } from '../database-adapters/database-adapters.module.js';
import { TableBrowserController } from './table-browser.controller.js';
import { TableBrowserService } from './table-browser.service.js';

@Module({
  imports: [ConnectionsModule, DatabaseAdaptersModule],
  controllers: [TableBrowserController],
  providers: [TableBrowserService],
})
export class TableBrowserModule {}
