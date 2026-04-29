import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ConnectionsService } from './connections.service.js';
import { CreateConnectionDto } from './dto/create-connection.dto.js';
import { TestConnectionDto } from './dto/test-connection.dto.js';

@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post('test')
  test(@Body() dto: TestConnectionDto) {
    return this.connectionsService.testConnection(dto);
  }

  @Post()
  create(@Body() dto: CreateConnectionDto) {
    return this.connectionsService.create(dto);
  }

  @Get()
  findAll() {
    return this.connectionsService.findAll();
  }

  @Get('active')
  getActive() {
    return this.connectionsService.getActive();
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.connectionsService.activate(id);
  }
}
