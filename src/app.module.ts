import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConnectionsModule } from './connections/connections.module.js';
import { IntrospectionModule } from './introspection/introspection.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { TableBrowserModule } from './table-browser/table-browser.module.js';

@Module({
  imports: [
    PrismaModule,
    ConnectionsModule,
    IntrospectionModule,
    TableBrowserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
